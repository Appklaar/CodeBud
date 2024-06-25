import React from "react";
import { connector } from './../../Connector';
import { codebudConsoleWarn } from "../../helpers/helperFunctions";

type ErrorBoundaryProps = {
  fallback?: any;
  children: any;
};

type ErrorBoundaryState = {
  componentStack: null | string;
  error: null | Error;
};

const INITIAL_STATE: ErrorBoundaryState = {
  componentStack: null,
  error: null
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = INITIAL_STATE;
  }

  static getDerivedStateFromError(error: Error) {
    return { error: error };
  }

  componentDidCatch(error: Error, { componentStack }: React.ErrorInfo) {
    connector.captureCrashReport("React ErrorBoundary", {message: error.message, componentStack});
  }

  render() {
    const { fallback, children } = this.props;
    const state = this.state;

    if (state.error) {
      let element: any = undefined;
      if (typeof fallback === 'function') {
        element = React.createElement(fallback, {
          error: state.error,
          componentStack: state.componentStack ,
          resetError: () => this.setState(INITIAL_STATE)
        });
      } else {
        element = fallback;
      }

      if (React.isValidElement(element)) {
        return element;
      }

      if (fallback) {
        codebudConsoleWarn("ErrorBoundary fallback did not produce a valid ReactElement");
      }

      // Fail gracefully if no fallback provided or is not valid
      return null;
    }

    if (typeof children === 'function') {
      return (children)();
    }

    return children;
  }
}