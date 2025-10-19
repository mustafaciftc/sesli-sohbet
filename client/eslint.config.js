import js from "@eslint/js";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default [
  js.configs.recommended,

  // React and Hooks Configuration
  {
    files: ["**/*.{js,jsx,ts,tsx}"], // Include TypeScript files for broader coverage
    
    // Language Options: Define parser and environment settings
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true, // Enable JSX parsing
        },
        sourceType: "module", // Support ES modules (import/export)
        ecmaVersion: "latest", // Use the latest ECMAScript version
      },
      globals: {
        ...globals.browser, // Browser globals (e.g., window, document)
        ...globals.node, // Node.js globals (e.g., process, require) if used in server-side code
      },
    },

    // Plugins and Settings
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooks,
    },
    
    settings: {
      react: {
        version: "detect", // Automatically detect React version
      },
    },

    rules: {
      // Disable 'react-in-jsx-scope' for React 17+ with automatic runtime
      "react/react-in-jsx-scope": "off",
      
      // Apply recommended React rules
      ...reactPlugin.configs.recommended.rules,
      
      // Enforce React Hooks rules
      "react-hooks/rules-of-hooks": "error", // Prevent invalid hook usage
      "react-hooks/exhaustive-deps": "warn", // Warn on missing dependencies in useEffect/useCallback
      
      // Disable prop-types if not using them
      "react/prop-types": "off",
      
      // Additional recommended adjustments
      "react/no-unescaped-entities": "warn", // Warn about unescaped HTML entities in JSX
      "react/display-name": "off", // Disable if using functional components without displayName
    },
  },
];