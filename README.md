# VSCode Extension bq dryrun sql linter

VSCode Extension bq dryrun sql linter is a Visual Studio Code extension that checks SQL code against a BigQuery server using the dry run command. It shows errors returned from the server directly in the editor, helping developers catch issues in their SQL code early.

## Features

- Lint SQL files by performing a dry run against a BigQuery server.
- Display errors and warnings inline in the editor.
- Supports `.sql` and `.sql.jinja` files.
- Activates on startup to ensure seamless integration.

## Installation

You can install the extension directly from the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=timle.bq-dryrun-sql-linter):

1. **Install from Marketplace**:
   - Open Visual Studio Code.
   - Go to the Extensions view (`Ctrl`+`Shift`+`X` or `Cmd`+`Shift`+`X`).
   - In the search box, type `BQ Dry Run SQL Linter`.
   - Find the extension published by `timle`.
   - Click **Install** to add the extension to your VS Code.

Alternatively, you can install it directly from the marketplace link:

- Visit the [extension page on Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=timle.bq-dryrun-sql-linter).
- Click **Install** and follow the prompts to install the extension.

## Usage

### Lint on Save (default)

- Open a `.sql` or `.sql.jinja` file in Visual Studio Code.
- The extension will automatically perform a dry run against the BigQuery server and display any errors or warnings in the Problems panel and inline in the editor.

### Manual Lint

- Command Palette -> `>BQ Dry Run SQL Linter: Run Linting`

### Live Lint

- See below `sqlLinter.liveLinting` to enable, along with settings to customize the frequency of BQ server connections to run the dry run process.

## Requirements

- Access to a Google Cloud BigQuery project.
- Properly configured Google Cloud credentials.

If you are running dbt locally, you've already done this. For others, see:

- [Install the Google Cloud SDK](https://cloud.google.com/sdk/docs/install)
- [Authenticate with Google Cloud](https://cloud.google.com/docs/authentication/getting-started)

## Extension Settings

### Extension Activation

Starting from version 0.0.2, the extension activates on startup (`onStartupFinished`). This ensures that the extension is active even when opening a `.sql.jinja` file first, resolving previous issues where the extension did not activate unless a `.sql` file was opened first.

### Lint on Save

By default, the extension lints SQL files when they are saved.

### Live Lint Option

Users can enable live linting through the extension settings (`sqlLinter.liveLinting`).

### Debouncing and Rate Limiting

When live linting is enabled, debouncing and rate limiting control the number of requests to the BigQuery server, minimizing the number of requests per minute.

### Configurable Settings

- **Debounce Interval (`sqlLinter.debounceInterval`)**: Adjust the debounce interval in milliseconds.
- **Rate Limit (`sqlLinter.rateLimit`)**: Set the maximum number of requests per minute.
- **Language Folders (`sqlLinter.languageFolders`)**: Specify custom file suffixes and folder paths where linting should be enabled.

#### sqlLinter.languageFolders

By default all files with language type '.sql' will be linted. 

Additionally, the `sqlLinter.languageFolders` setting allows you to define an array of `fileSuffix` and `folderPath` pairs to specify where linting should be enabled. This is particularly useful if your project uses custom file extensions or organizes SQL files in specific directories.

**Default Value**:
dbt opinionated:
```json
[
  {
    "fileSuffix": ".sql",
    "folderPath": "target/compiled/"
  }
]
```

**Usage Example**:

```json
"sqlLinter.languageFolders": [
  {
    "fileSuffix": ".sql",
    "folderPath": "src/queries/"
  },
  {
    "fileSuffix": ".sql.jinja",
    "folderPath": "templates/sql/"
  }
]
```

In this example:

- Files ending with `.sql` in the `src/queries/` directory will be linted.
- Files ending with `.sql.jinja` in the `templates/sql/` directory will also be linted.

This setting provides flexibility to lint SQL files located in various directories and with different file extensions, accommodating diverse project structures.

**Configuration Steps**:

1. Open your VS Code settings (`Ctrl`+`Comma` or `Cmd`+`Comma`).
2. Search for `sqlLinter.languageFolders`.
3. Edit the setting by adding your desired `fileSuffix` and `folderPath` pairs.

## Dev Work

To test and use the extension:

Open the project folder in VS Code:

- You can run `code .` in the terminal from the project directory to open VS Code in the current folder.
- Ensure all dependencies are installed (already done with `npm install`).

Launch the extension in a new Extension Development Host window:

- Press `F5` in VS Code. This will compile the extension and open a new window where the extension is running.
- In the new window, create or open a `.sql` or `.sql.jinja` file and write some SQL code.

As you write, the extension will send your SQL code to BigQuery for a dry run. Any errors returned from BigQuery will be highlighted directly in the editor.

### Packaging

- Run `vsce package` to create a `.vsix` package of the extension.

### Publishing

Refer to the [Publishing Extension Guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension):

- Run `vsce login <publisher id>` to log in.
- Run `vsce publish` to publish the extension.

## Known Issues

- Currently supports only BigQuery SQL syntax.
- May not handle all types of SQL syntax variations.

## Release Notes

### 0.0.2

- Added activation on startup to support `.sql.jinja` files when opened first.

### 0.0.1

- Initial release of SQL Linter extension.

## License

[MIT License](LICENSE.txt)
