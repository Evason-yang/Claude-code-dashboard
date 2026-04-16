import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (this.state.error) return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#f85149', fontFamily: 'monospace', gap: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 600 }}>页面发生错误</div>
        <div style={{ fontSize: 12, color: '#8b949e', maxWidth: 480, textAlign: 'center' }}>{this.state.error?.message}</div>
        <button onClick={() => this.setState({ error: null })} style={{ padding: '6px 16px', fontSize: 13, borderRadius: 5, border: '1px solid #f85149', background: 'none', color: '#f85149', cursor: 'pointer' }}>重试</button>
      </div>
    )
    return this.props.children
  }
}

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </BrowserRouter>
)
