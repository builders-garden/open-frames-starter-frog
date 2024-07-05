import { serveStatic } from "@hono/node-server/serve-static";
import { Button, Frog, TextInput } from "frog";
import { devtools } from "frog/dev";
import { validateFramesPost } from "@xmtp/frames-validator";
import { Next, Context } from "hono";
import { parseUnits, encodeFunctionData, erc20Abi, Abi } from "viem";
// import { neynar } from 'frog/hubs'

const addMetaTags = (client: string, version?: string) => {
  // Follow the OpenFrames meta tags spec
  return {
    unstable_metaTags: [
      { property: `of:accepts`, content: version || "vNext" },
      { property: `of:accepts:${client}`, content: version || "vNext" },
    ],
  };
};

type State = {
  count: number;
};

export const app = new Frog<{ State: State }>({
  title: "Open Frames Starter Frog",
  initialState: {
    count: 0,
  },
  ...addMetaTags("xmtp"),
  // Supply a Hub to enable frame verification.
  // hub: neynar({ apiKey: 'NEYNAR_FROG_FM' })
});

const xmtpSupport = async (c: Context, next: Next) => {
  // Check if the request is a POST and relevant for XMTP processing
  if (c.req.method === "POST") {
    const requestBody = (await c.req.json().catch(() => {})) || {};
    if (requestBody?.clientProtocol?.includes("xmtp")) {
      c.set("client", "xmtp");
      const { verifiedWalletAddress } = await validateFramesPost(requestBody);
      c.set("verifiedWalletAddress", verifiedWalletAddress);
    } else {
      // Add farcaster check
      c.set("client", "farcaster");
    }
  }
  await next();
};

app.use(xmtpSupport);

app.use("/*", serveStatic({ root: "./public" }));

app.transaction("/tx", (c) => {
  let address: `0x${string}`;

  // XMTP verified address
  const { verifiedWalletAddress } = (c?.var as any) || {};

  if (verifiedWalletAddress) {
    address = verifiedWalletAddress as `0x${string}`;
  } else {
    address = c.address as `0x${string}`;
  }

  // Get current storage price
  const units = BigInt(parseUnits("1", 6));

  // Transfering 1 USDC to yourself
  const calldata = encodeFunctionData({
    abi: erc20Abi,
    functionName: "transfer",
    args: [address as `0x${string}`, units] as const,
  });

  const BASE_USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  return c.res({
    chainId: "eip155:8453", // Base Mainnet 8453
    method: "eth_sendTransaction",
    params: {
      abi: erc20Abi as Abi,
      to: BASE_USDC_ADDRESS,
      data: calldata,
      value: BigInt(0),
    },
  });
});

app.frame("/tx-success", (c) => {
  return c.res({
    image: (
      <div
        style={{
          alignItems: "center",
          background: "white",
          backgroundSize: "100% 100%",
          display: "flex",
          flexDirection: "column",
          flexWrap: "nowrap",
          height: "100%",
          justifyContent: "center",
          textAlign: "center",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            color: "black",
            fontSize: 60,
            fontStyle: "normal",
            letterSpacing: "-0.025em",
            lineHeight: 1.4,
            marginTop: 30,
            padding: "0 120px",
            whiteSpace: "pre-wrap",
          }}
        >
          Transaction Successful
        </div>
      </div>
    ),
    intents: [<Button action="/">Back</Button>],
  });
});

app.frame("/submit", (c) => {
  const { buttonValue, inputText, deriveState } = c;
  const state = deriveState((previousState) => {
    previousState.count++;
  });
  return c.res({
    action: "/",
    image: (
      <div
        style={{
          alignItems: "center",
          background: "white",
          backgroundSize: "100% 100%",
          display: "flex",
          flexDirection: "column",
          flexWrap: "nowrap",
          height: "100%",
          justifyContent: "center",
          textAlign: "center",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            color: "black",
            fontSize: 60,
            fontStyle: "normal",
            letterSpacing: "-0.025em",
            lineHeight: 1.4,
            marginTop: 30,
            padding: "0 120px",
            whiteSpace: "pre-wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
            }}
          >
            Current State: {state.count}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
            }}
          >
            You typed: {inputText}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
            }}
          >
            You clicked button: {buttonValue}
          </div>
        </div>
      </div>
    ),
    intents: [<Button>Back</Button>],
  });
});

app.frame("/", (c) => {
  return c.res({
    image: (
      <div
        style={{
          alignItems: "center",
          background: "white",
          backgroundSize: "100% 100%",
          display: "flex",
          flexDirection: "column",
          flexWrap: "nowrap",
          height: "100%",
          justifyContent: "center",
          textAlign: "center",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            color: "black",
            fontSize: 60,
            fontStyle: "normal",
            letterSpacing: "-0.025em",
            lineHeight: 1.4,
            marginTop: 30,
            padding: "0 120px",
            whiteSpace: "pre-wrap",
          }}
        >
          Open Frames - Frog Starter
        </div>
      </div>
    ),
    intents: [
      <TextInput placeholder="Type something here" />,
      <Button.Link href="https://github.com/builders-garden/open-frames-starter-frog">
        Link
      </Button.Link>,
      <Button action="/submit" value="post-button">
        Post
      </Button>,
      <Button.Transaction target="/tx" action="/tx-success">
        Tx
      </Button.Transaction>,
    ],
  });
});

devtools(app, { serveStatic });
