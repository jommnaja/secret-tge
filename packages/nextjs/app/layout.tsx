import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@rainbow-me/rainbowkit/styles.css";
import { DappWrapperWithProviders } from "~~/components/DappWrapperWithProviders";
import { ThemeProvider } from "~~/components/ThemeProvider";
import "~~/styles/globals.css";
import { getMetadata } from "~~/utils/helper/getMetadata";

export const metadata = getMetadata({
  title: "Secret FHE TGE Prediction",
  description: "Built with FHEVM",
});

const DappWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <html suppressHydrationWarning className={``}>
      <head>
        <link href="https://api.fontshare.com/v2/css?f[]=telegraf@400,500,700&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-[#0a0a0a]!">
        <MantineProvider defaultColorScheme="light">
          <ThemeProvider enableSystem>
            <DappWrapperWithProviders>{children}</DappWrapperWithProviders>
          </ThemeProvider>
        </MantineProvider>
      </body>
    </html>
  );
};

export default DappWrapper;
