import { useState } from "react";

export default function VolumetricCalculator() {
  const [l, setL] = useState("");
  const [w, setW] = useState("");
  const [h, setH] = useState("");
  const [result, setResult] = useState(null);

  const calculate = () => {
    if (!l || !w || !h) return;

    const volumetricWeight = (l * w * h) / 5000;
    setResult(volumetricWeight.toFixed(2));
  };

  return (
    <div>
      <h2>Volumetric Weight</h2>

      <input placeholder="Length (cm)" onChange={(e) => setL(e.target.value)} />
      <input placeholder="Width (cm)" onChange={(e) => setW(e.target.value)} />
      <input placeholder="Height (cm)" onChange={(e) => setH(e.target.value)} />

      <button onClick={calculate}>Calculate</button>

      {result && <h3>Volumetric Weight: {result} kg</h3>}
    </div>
  );
}