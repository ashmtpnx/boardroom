import { lazy, Suspense, useEffect, useState } from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { store } from './app/store';
import { restoreSession } from './auth/auth';
import { createRealtime } from './realtime/RealtimeProvider';
import { setRealtimeClient } from './realtime/client';
import { setUser, setRoomId, setRoomSettings, setPasswordRequired, realtimeConnected, leaving } from './features/session/sessionSlice';
import { rememberBoard } from './utils/recentBoards';
import { applyProfile } from './utils/profile';
import { registerSelf } from './utils/directory';
import Login from './components/Login/Login';
import Home from './components/Home/Home';
import Account from './components/Account/Account';
import Messages from './components/Messages/Messages';
import FriendChat from './components/Chat/FriendChat';
import InboxProvider from './realtime/InboxProvider';
import TopBar from './components/TopBar';
import Toolbar from './components/Toolbar/Toolbar';
import Sidebar from './components/Sidebar/Sidebar';
import PageControls from './components/PageControls/PageControls';
import RoomReactions from './components/Reactions/RoomReactions';
import RoomLockScreen from './components/RoomLockScreen/RoomLockScreen';
import styles from './App.module.css';

// Fabric.js is ~500 KB — the single biggest dependency, and it's only needed on a
// board. Load it lazily so the login/home flow doesn't pay for it up front.
const Canvas = lazy(() => import('./features/canvas/Canvas'));

// The URL hash is the router: '' = home, 'account' = account page, else a board.
function getRoute() {
  const h = window.location.hash.replace(/^#/, '').trim();
  if (!h) return { name: 'home' };
  if (h === 'account') return { name: 'account' };
  if (h === 'messages') return { name: 'messages' };
  if (h.startsWith('dm/')) return { name: 'dm', friendTag: h.slice(3) };
  return { name: 'board', roomId: h };
}

// A single board: resolve the room, connect realtime, render the workspace.
// Mounted with key={roomId} so switching rooms gives a clean reconnect.
function Board({ roomId }) {
  const dispatch = useDispatch();
  const user = useSelector((s) => s.session.currentUser);
  const passwordRequired = useSelector((s) => s.session.passwordRequired);
  const passwordError = useSelector((s) => s.session.passwordError);
  const roomSettings = useSelector((s) => s.session.roomSettings);

  useEffect(() => {
    let cleanup = () => {};
    let cancelled = false;

    dispatch(setRoomId(roomId));
    rememberBoard(roomId);

    let initialName = undefined;
    let initialPassword = undefined;
    try {
      const stored = sessionStorage.getItem(`room_init_${roomId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        initialName = parsed.name;
        initialPassword = parsed.password;
        sessionStorage.removeItem(`room_init_${roomId}`);
      }
    } catch (err) {
      // ignore
    }

    (async () => {
      const rt = await createRealtime();
      if (cancelled) return;
      
      rt.connect(roomId, user, {
        initialName,
        initialPassword,
        onPasswordRequired: (info) => {
          if (!cancelled) dispatch(setPasswordRequired(info));
        },
        onSettings: (settings) => {
          if (!cancelled) {
            dispatch(setRoomSettings(settings));
            dispatch(realtimeConnected());
          }
        },
      });

      setRealtimeClient(rt);
      dispatch(realtimeConnected());

      const onUnload = () => dispatch(leaving());
      window.addEventListener('beforeunload', onUnload);
      cleanup = () => {
        window.removeEventListener('beforeunload', onUnload);
        dispatch(leaving());
        rt.disconnect();
      };
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
    // user is resolved before any Board mounts (see Root), so it's stable here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, dispatch]);

  if (passwordRequired) {
    return (
      <RoomLockScreen
        roomId={roomId}
        roomName={roomSettings?.name}
        adminName={roomSettings?.adminName}
        error={passwordError}
      />
    );
  }

  return (
    <div className={styles.app}>
      <TopBar />
      <div className={styles.body}>
        <div className={styles.stage}>
          <Toolbar />
          <Suspense fallback={<div className={styles.canvasLoading} aria-busy="true" />}>
            <Canvas />
          </Suspense>
          <RoomReactions />
          <PageControls />
        </div>
        <Sidebar />
      </div>
    </div>
  );
}

// Signs the user in once, then routes between Home and a Board based on the hash.
function Root() {
  const dispatch = useDispatch();
  const user = useSelector((s) => s.session.currentUser);
  const [route, setRoute] = useState(getRoute);
  const [restoring, setRestoring] = useState(true);

  // Try to restore an existing session (Google or guest) without prompting.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const u = await restoreSession();
      if (cancelled) return;
      if (u) dispatch(setUser(applyProfile(u)));
      setRestoring(false);
    })();
    return () => { cancelled = true; };
  }, [dispatch]);

  // Publish our public card to the directory whenever our identity/profile
  // changes, so friends can resolve our account ID to a real profile.
  useEffect(() => {
    if (user?.id) registerSelf(user);
  }, [user?.id, user?.name, user?.color, user?.photoURL]);

  // Hash is the router.
  useEffect(() => {
    const onHash = () => setRoute(getRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  if (restoring) {
    return (
      <div className={styles.splash}>
        <img src="/board.svg" className={styles.splashMark} alt="" />
      </div>
    );
  }

  // No session yet → show the login screen.
  if (!user) {
    return <Login onSignedIn={(u) => dispatch(setUser(applyProfile(u)))} />;
  }

  // Resolve the current route's screen.
  let screen;
  if (route.name === 'account') screen = <Account />;
  else if (route.name === 'messages') screen = <Messages />;
  else if (route.name === 'dm') screen = <FriendChat key={route.friendTag} friendTag={route.friendTag} />;
  else if (route.name === 'board') screen = <Board key={route.roomId} roomId={route.roomId} />;
  else screen = <Home />;

  // InboxProvider is a route-independent side-effect mount: it keeps us connected
  // to our personal inbox channel so friend requests / accepts arrive on every
  // screen (even Home), turning them into local state + notifications.
  return (
    <>
      <InboxProvider />
      {screen}
    </>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <Root />
    </Provider>
  );
}
