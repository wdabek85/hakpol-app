import { useState } from 'react';
import ModelList from './ModelList.jsx';
import ModelDetail from './ModelDetail.jsx';

export default function Catalog({ activeModel, setActiveModel }) {
  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <ModelList activeModel={activeModel} setActiveModel={setActiveModel} />
      <ModelDetail activeModel={activeModel} />
    </div>
  );
}
