import * as crypto from "node:crypto";
import * as vscode from "vscode";

const CACHE_BUST_RADIX = 36;
const NONCE_BYTE_LENGTH = 18;

export function getWebviewHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  const nonce = createNonce();
  const cacheBust = Date.now().toString(CACHE_BUST_RADIX);
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "dist", "webview-main.js"),
  );
  const globalCssUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "dist", "webview.css"),
  );
  const scriptHref = String(scriptUri);
  const cssHref = String(globalCssUri);

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'none'; img-src ${webview.cspSource} data:; font-src ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'nonce-${nonce}';"
    />
    <link rel="stylesheet" href="${cssHref}?v=${cacheBust}" />
    <title>Cursor Cafe</title>
  </head>
  <body>
    <div id="app"></div>
    <script nonce="${nonce}" type="module" src="${scriptHref}?v=${cacheBust}"></script>
  </body>
</html>`;
}

function createNonce(): string {
  return crypto.randomBytes(NONCE_BYTE_LENGTH).toString("base64url");
}
