import Head from 'next/head';
import { Chessboard } from 'react-chessboard';

export default function Home() {
  return (
    <>
      <Head>
        <title>TwentyFish</title>
      </Head>
      <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <h1 className="text-4xl font-bold mb-6">TwentyFish</h1>
        <Chessboard id="main-board" />
        <p className="mt-4 text-gray-600">Play chess vs 20 Stockfish levels!</p>
      </main>
    </>
  );
}
