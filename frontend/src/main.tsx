import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/fonts.css'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './auth/AuthContext'

// Fix for browser extensions that modify the DOM and cause React errors
// This prevents "removeChild" errors caused by extensions like translators
const originalRemoveChild = Node.prototype.removeChild;
Node.prototype.removeChild = function<T extends Node>(child: T): T {
  if (child.parentNode !== this) {
    if (console.warn) {
      console.warn('Cannot remove child: Node is not a child of this node', child, this);
    }
    return child;
  }
  return originalRemoveChild.call(this, child) as T;
};

const originalInsertBefore = Node.prototype.insertBefore;
Node.prototype.insertBefore = function<T extends Node>(newNode: T, referenceNode: Node | null): T {
  if (referenceNode && referenceNode.parentNode !== this) {
    if (console.warn) {
      console.warn('Cannot insert before: Reference node is not a child of this node', referenceNode, this);
    }
    return newNode;
  }
  return originalInsertBefore.call(this, newNode, referenceNode) as T;
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
)
