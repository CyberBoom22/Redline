import React from 'react';

/** Four corner rivets. The parent must be `position: relative`. */
export const Rivets: React.FC = () => (
  <>
    <span aria-hidden="true" className="rivet top-[14px] left-[14px]" />
    <span aria-hidden="true" className="rivet top-[14px] right-[14px]" />
    <span aria-hidden="true" className="rivet bottom-[14px] left-[14px]" />
    <span aria-hidden="true" className="rivet bottom-[14px] right-[14px]" />
  </>
);
