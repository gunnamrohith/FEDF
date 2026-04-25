const Child1 = ({ key1, key2, sendData }) => {

  return (
    <>
      <h1>{key1}</h1>
      <h1>{key2}</h1>

      <button onClick={() => sendData("Hi Parent!")}>
        Send Message to Parent
      </button>
    </>
  );
};

export default Child1;