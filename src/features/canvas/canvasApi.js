// Singleton bridge to the imperative Fabric canvas API created in
// useFabricCanvas. Lets sibling components (Toolbar, TopBar) trigger
// clear / image-upload / export / zoom without prop-drilling the instance.
let api = null;

export function setCanvasApi(a) {
  api = a;
}

export function getCanvasApi() {
  return api;
}
