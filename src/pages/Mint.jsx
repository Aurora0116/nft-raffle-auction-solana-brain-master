import loadable from "@loadable/component";

const Claim = loadable(() => import("../components/Claim"));

export default function Mint({
  candyMachineId,
  connection,
  txTimeout,
  rpcHost,
}) {
  return (
    <Claim
      candyMachineId={candyMachineId}
      connection={connection}
      txTimeout={txTimeout}
      rpcHost={rpcHost}
    />
  );
}
