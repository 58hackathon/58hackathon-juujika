import type { Screen } from "./routes/screenTypes";

function App() {
  const currentScreen: Screen = "home";

  return (
    <main>
      <h1>わらしべ</h1>
      <p>Current screen: {currentScreen}</p>
    </main>
  );
}

export default App;

