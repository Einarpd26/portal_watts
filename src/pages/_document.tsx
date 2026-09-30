import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="es">
      <Head>
        {/* PWA: manifest + metadatos de instalación (RNF de instalabilidad móvil) */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#dc2626" />
        {/* iOS Safari no lee el manifest para "Agregar a inicio"; necesita estos tags aparte */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Portal Watts" />
        <link rel="apple-touch-icon" href="/icon-watts.png" />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
