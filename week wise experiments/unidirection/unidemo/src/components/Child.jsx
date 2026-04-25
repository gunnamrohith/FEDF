import React from "react";

const Child = (props) => {
  return (
    <div>
      <h2>Child Component</h2>
      <p>Key1: {props.key1}</p>
      <p>Key2: {props.key2}</p>
    </div>
  );
};

export default Child;