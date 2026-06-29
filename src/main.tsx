import ReactDOM from 'react-dom/client';
import App from './App';

kintone.events.on('app.record.index.show', (event) => {
  if (event.viewId !== 6486555) return event;

  const space = kintone.app.getHeaderSpaceElement();
  if (space) {
    // 避免重複 render
    if (space.dataset.mounted) return event;
    space.dataset.mounted = 'true';

    const root = ReactDOM.createRoot(space);
    root.render(<App />);
  }

  return event;
});