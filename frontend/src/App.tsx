import type { Screen } from "./routes/screenTypes";

function App() {
  const currentScreen: Screen = "home";

  return (
    <main>
      <h2>わらしべ</h2>
      <p>Current screen: {currentScreen}</p>
    </main>
  );
}

export default App;
