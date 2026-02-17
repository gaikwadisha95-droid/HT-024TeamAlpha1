import express from "express";
import { predictCongestion } from "./predict.js";
import { calculateSignal } from "./signalLogic.js";

const app = express();
app.use(express.json());

app.post("/traffic", (req, res) => {
  const congestion = predictCongestion(req.body);
  const signalTime = calculateSignal(congestion);

  res.json({
    congestion,
    greenSignalTime: signalTime
  });
});

app.listen(5000, () => console.log("Smart traffic AI running"));
