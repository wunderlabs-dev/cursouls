import * as vscode from "vscode";

export function getWebviewHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  const nonce = createNonce();
  const cacheBust = Date.now().toString(36);
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "dist", "webview-main.js"),
  );
  const globalCssUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "src", "static", "css", "globals.css"),
  );

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'none'; img-src ${webview.cspSource} data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'nonce-${nonce}';"
    />
    <link rel="stylesheet" href="${globalCssUri}?v=${cacheBust}" />
    <title>Cursor Cafe</title>
  </head>
  <body>
    <div id="app"></div>
    <script nonce="${nonce}" type="module" src="${scriptUri}?v=${cacheBust}"></script>
  </body>
</html>`;
}

function createNonce(length = 24): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i += 1) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
