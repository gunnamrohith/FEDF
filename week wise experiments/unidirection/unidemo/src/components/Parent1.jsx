import Child1 from "./Child1";

const Parent1 = () => {

  // Callback function (this will be called by child)
  const handleMessage = (msg) => {
    alert("Message from Child: " + msg);
  };

  return (
    <>
      <h1>Parent1 Component</h1>

      <Child1 key1={"hello"} key2={500}
        sendData={handleMessage}  // passing function as prop
      />
    </>
  );
};

export default Parent1;