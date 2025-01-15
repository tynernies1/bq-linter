// The module 'vscode' contains the VS Code extensibility API
const vscode = require('vscode');
const { BigQuery } = require('@google-cloud/bigquery');
const debounce = require('lodash.debounce');
const path = require('path');

let statusBarItem;

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  console.log('SQL Linter extension is now active!');

  // Register the manual linting command
  context.subscriptions.push(
    vscode.commands.registerCommand('sqlLinter.runLinting', async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const document = editor.document;
        await lintDocument(document, true);
      } else {
        vscode.window.showInformationMessage('No active editor detected.');
      }
    })
  );

  // Create a diagnostic collection
  const diagnosticCollection = vscode.languages.createDiagnosticCollection('sql');

  // Create status bar item
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.text = 'Dry Run Ready';
  context.subscriptions.push(statusBarItem);

  // Function to perform linting
  const lintDocument = async (document, ignoreFileType = false) => {
    // Only process documents with the 'file' scheme
    if (document.uri.scheme !== 'file') {
      console.log(`Ignoring resource with scheme '${document.uri.scheme}'`);
      return;
    }

    if (!ignoreFileType) {
      const documentPath = document.uri.fsPath;
      const documentLanguageId = document.languageId;

      // Get the configuration setting
      const config = vscode.workspace.getConfiguration('sqlLinter');
      const languageFolders = config.get('languageFolders', []);

      let shouldLint = false;

      // Get the relative path of the document within the workspace
      const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
      const relativePath = workspaceFolder
        ? path.relative(workspaceFolder.uri.fsPath, documentPath)
        : documentPath;

      let fileName = path.basename(documentPath);

      // Remove '.git' if present at the end of the file name
      if (fileName.endsWith('.git')) {
        fileName = fileName.slice(0, -4); // Remove last 4 characters
      }

      // Check if the document matches any of the fileSuffix-folderPath pairs
      for (const entry of languageFolders) {
        const fileSuffix = entry.fileSuffix;
        const folderPath = entry.folderPath;

        console.log(`Checking fileSuffix '${fileSuffix}' in folder '${folderPath}' for '${relativePath}'`);

        if (fileName.endsWith(fileSuffix) && relativePath.includes(folderPath)) {
          shouldLint = true;
          console.log(
            `Linting enabled for files with suffix '${fileSuffix}' in folder '${folderPath}'`
          );
          break;
        }
      }

      // If no matches found, check if document is 'sql' language
      if (!shouldLint) {
        if (documentLanguageId === 'sql') {
          shouldLint = true;
          console.log("Linting enabled for languageId 'sql'");
        } else {
          console.log(`Linting not enabled for file '${documentPath}'`);
          // Do not lint this document
          return;
        }
      }
    }

    const sqlCode = document.getText();

    // Initialize BigQuery client
    const bigquery = new BigQuery();

    try {
      // Update status bar to show progress
      statusBarItem.text = '$(sync~spin) Dry Run...';
      statusBarItem.show();

      // Configure dry run query
      const options = {
        query: sqlCode,
        dryRun: true,
        useQueryCache: false,
      };

      // Run the dry run
      await bigquery.createQueryJob(options);

      // Clear any existing diagnostics if the query is valid
      diagnosticCollection.set(document.uri, []);

      console.log('Query dry run performed successfully.');
    } catch (error) {
      // Collect diagnostics from BigQuery errors
      const diagnostics = [];
      if (error.errors && error.errors.length > 0) {
        error.errors.forEach((err) => {
          const message = err.message;

          // Try to extract line and character from error message
          const match = message.match(/at \[(\d+):(\d+)\]/);
          let range;

          if (match) {
            const line = parseInt(match[1], 10) - 1; // VS Code lines are 0-indexed
            const character = parseInt(match[2], 10) - 1; // VS Code characters are 0-indexed

            // Highlight from the error position to the end of the line
            range = new vscode.Range(
              new vscode.Position(line, character),
              new vscode.Position(line, document.lineAt(line).range.end.character)
            );
          } else {
            // If no match, highlight the entire document
            range = new vscode.Range(
              document.positionAt(0),
              document.positionAt(sqlCode.length)
            );
          }

          const diagnostic = new vscode.Diagnostic(
            range,
            message,
            vscode.DiagnosticSeverity.Error
          );
          diagnostics.push(diagnostic);
        });
      } else {
        // General error without specific details
        const range = new vscode.Range(
          document.positionAt(0),
          document.positionAt(sqlCode.length)
        );
        const diagnostic = new vscode.Diagnostic(
          range,
          error.message,
          vscode.DiagnosticSeverity.Error
        );
        diagnostics.push(diagnostic);
      }
      diagnosticCollection.set(document.uri, diagnostics);
      console.error('Query not performed:', error);
    } finally {
      // Reset status bar item
      statusBarItem.text = 'Dry Run Ready';
      statusBarItem.show();
    }
  };

  // Read configuration settings
  const config = vscode.workspace.getConfiguration('sqlLinter');
  const liveLinting = config.get('liveLinting', false);
  const debounceInterval = config.get('debounceInterval', 500);
  const rateLimit = config.get('rateLimit', 30);

  // Rate limiting variables
  let requestCount = 0;
  let rateLimitResetTime = Date.now() + 60000; // 1 minute from now

  // Debounced and rate-limited linting function
  const debouncedLint = debounce(async (document) => {
    const currentTime = Date.now();

    // Reset rate limit every minute
    if (currentTime > rateLimitResetTime) {
      requestCount = 0;
      rateLimitResetTime = currentTime + 60000;
    }

    if (requestCount >= rateLimit) {
      vscode.window.showWarningMessage(
        'Rate limit exceeded for live linting. Change settings or slow down.'
      );
      return;
    }

    requestCount++;

    await lintDocument(document);
  }, debounceInterval);

  // Lint on open
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(async (document) => {
      await lintDocument(document);
    })
  );

  // Lint on save
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(async (document) => {
      await lintDocument(document);
    })
  );

  // Live linting
  if (liveLinting) {
    context.subscriptions.push(
      vscode.workspace.onDidChangeTextDocument(async (event) => {
        const document = event.document;
        debouncedLint(document);
      })
    );
  }

  // Update status bar visibility based on active editor
  function updateStatusBarVisibility() {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const document = editor.document;

      // Only process documents with the 'file' scheme
      if (document.uri.scheme !== 'file') {
        console.log(`Ignoring resource with scheme '${document.uri.scheme}'`);
        statusBarItem.hide();
        return;
      }

      const documentPath = document.uri.fsPath;
      const documentLanguageId = document.languageId;

      // Get the configuration setting
      const config = vscode.workspace.getConfiguration('sqlLinter');
      const languageFolders = config.get('languageFolders', []);

      let shouldShow = false;

      // Get the relative path of the document within the workspace
      const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
      const relativePath = workspaceFolder
        ? path.relative(workspaceFolder.uri.fsPath, documentPath)
        : documentPath;

      let fileName = path.basename(documentPath);

      // Remove '.git' if present at the end of the file name
      if (fileName.endsWith('.git')) {
        fileName = fileName.slice(0, -4); // Remove last 4 characters
      }

      // Check if the document matches any of the fileSuffix-folderPath pairs
      for (const entry of languageFolders) {
        const fileSuffix = entry.fileSuffix;
        const folderPath = entry.folderPath;

        if (fileName.endsWith(fileSuffix) && relativePath.includes(folderPath)) {
          shouldShow = true;
          console.log(
            `Status bar visible for files with suffix '${fileSuffix}' in folder '${folderPath}'`
          );
          break;
        }
      }

      // If no matches found, check if document is 'sql' language
      if (!shouldShow) {
        if (documentLanguageId === 'sql') {
          shouldShow = true;
          console.log("Status bar visible for languageId 'sql'");
        } else {
          console.log(`Status bar not visible for file '${documentPath}'`);
        }
      }

      if (shouldShow) {
        statusBarItem.show();
      } else {
        statusBarItem.hide();
      }
    } else {
      statusBarItem.hide();
    }
  }

  // Initialize status bar visibility
  updateStatusBarVisibility();

  // Listen for active editor changes to update status bar
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => {
      updateStatusBarVisibility();
    })
  );

  // Listen for changes in the document to update status bar visibility
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      // If the changed document is the active document
      if (event.document === vscode.window.activeTextEditor?.document) {
        updateStatusBarVisibility();
      }
    })
  );

  // Listen for configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('sqlLinter')) {
        // Notify user that settings have changed
        vscode.window.showInformationMessage('SQL Linter configuration changed.');
        // Update status bar visibility
        updateStatusBarVisibility();
      }
    })
  );
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
