import type { Screen } from "./routes/screenTypes";

function App() {
  const currentScreen: Screen = "home";

  return (
    <main>
      <h1>わらしべ</h1>

      <h2>わらしべ長者とは</h2>

      <p>Current screen: {currentScreen}</p>
    </main>
  );
}

export default App;

