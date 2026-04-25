import React from "react";
import Child from "./Child";

const Parent = () => {
  return (
    <div>
      <h1>Parent Component</h1>

      <Child key1="Hello " key2={2026} />
    </div>
  );
};

export default Parent;