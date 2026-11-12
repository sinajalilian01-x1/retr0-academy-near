import type { ProjectFile } from './types'

export const starterFiles = (): ProjectFile[] => [
  {
    name: 'index.html',
    content: `<main>
  <h1>Hello, Code E</h1>
  <p>Edit the HTML, CSS, and JavaScript. The preview runs on its own, or press Run.</p>
  <button id="btn" type="button">Click</button>
</main>
`,
  },
  {
    name: 'style.css',
    content: `body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: #f6f4ff;
  color: #1c1733;
  font-family: "Segoe UI", sans-serif;
}

main {
  width: min(440px, calc(100% - 32px));
}

h1 {
  margin: 0 0 8px;
  font-size: 32px;
  letter-spacing: -0.03em;
}

p {
  margin: 0;
  line-height: 1.5;
}

button {
  margin-top: 18px;
  border: 0;
  border-radius: 10px;
  padding: 12px 18px;
  background: #ff3fa4;
  color: #1a0a14;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

button:hover {
  background: #ff5fb7;
}

button:focus-visible {
  outline: 3px solid #0e7480;
  outline-offset: 2px;
}
`,
  },
  {
    name: 'script.js',
    content: `const button = document.querySelector("#btn");

console.log("Preview is ready.");

button.addEventListener("click", () => {
  console.log("clicked");
  button.textContent = "Clicked";
});
`,
  },
]
