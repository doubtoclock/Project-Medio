  import App from "./app/App.tsx";
  import ReactDOM from "react-dom/client";
  import { BrowserRouter } from "react-router-dom";
  import "./styles/index.css";
  import "leaflet/dist/leaflet.css";

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );