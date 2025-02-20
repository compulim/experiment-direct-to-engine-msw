import './App.css';

import { memo, useCallback, useState } from 'react';

import HTTPProxy from './HTTPProxy';
import WebChat from './WebChat';

export default memo(function App() {
  const [ready, setReady] = useState(false);

  const handleReady = useCallback(() => setReady(true), [setReady]);

  return (
    <div className="app">
      <div className="app__pane">
        <HTTPProxy onReady={handleReady} />
      </div>
      <div className="app__pane">{ready && <WebChat />}</div>
    </div>
  );
});
