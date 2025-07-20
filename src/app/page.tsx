"use client";

import { useState, useRef } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
} from "chart.js";

type ScoreData = {
  score: string;
  count: string;
};

export default function Home() {
  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
  );

  const chartRef = useRef<ChartJS<"line"> | null>(null);

  const [data, setData] = useState<ScoreData[]>([{ score: "", count: "" }]);
  const [results, setResults] = useState<
    | { average: number; stdDev: number }
    | null
  >(null);
  const [chartData, setChartData] = useState<ChartData<"line"> | null>(
    null
  );
  const [myScore, setMyScore] = useState<string>("");
  const [deviationResult, setDeviationResult] = useState<{
    deviationValue: number | null;
    scoreDifference: number;
  } | null>(null);

  const handleInputChange = (
    index: number,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const values = [...data];
    if (event.target.name === "score") {
      values[index].score = event.target.value;
    } else {
      values[index].count = event.target.value;
    }
    setData(values);
  };

  const addRow = () => {
    setData([...data, { score: "", count: "" }]);
  };

  const removeRow = (index: number) => {
    const values = [...data];
    values.splice(index, 1);
    setData(values);
  };

  const handleCalculate = () => {
    // 以前の計算結果をリセット
    setDeviationResult(null);
    setMyScore("");
    // 文字列を数値に変換し、無効な行（空の行など）を除外
    const validData = data
      .map((row) => ({
        score: parseFloat(row.score),
        count: parseInt(row.count, 10),
      }))
      .filter((row) => !isNaN(row.score) && !isNaN(row.count) && row.count > 0);

    if (validData.length === 0) {
      alert("有効なデータを入力してください。");
      setResults(null);
      setChartData(null);
      return;
    }

    // 合計人数を計算
    const totalCount = validData.reduce((sum, row) => sum + row.count, 0);
    if (totalCount === 0 || Number.isNaN(totalCount)) {
      setResults(null);
      setChartData(null);
      return;
    }

    // 平均点を計算
    const totalScoreSum = validData.reduce(
      (sum, row) => sum + row.score * row.count,
      0
    );
    const average = totalScoreSum / totalCount;

    // 分散と標準偏差を計算
    const variance =
      validData.reduce((sum, row) => sum + Math.pow(row.score - average, 2) * row.count, 0) / totalCount;
    const stdDev = Math.sqrt(variance) || 0;

    setResults({ average, stdDev });

    // 標準偏差が0またはNaNの場合はグラフを生成しない
    if (!stdDev || stdDev <= 0) {
      setChartData(null);
      return;
    }

    // グラフデータの生成
    const labels = [];
    const pdfData = [];
    const startX = average - 4 * stdDev;
    const endX = average + 4 * stdDev;
    const step = (endX - startX) / 100; // 101個のデータポイント

    for (let x = startX; x <= endX; x += step) {
      labels.push(x.toFixed(1));
      // 正規分布の確率密度関数(PDF)
      const exponent = -Math.pow(x - average, 2) / (2 * Math.pow(stdDev, 2));
      const pdf =
        (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
      pdfData.push(pdf);
    }

    setChartData({
      labels,
      datasets: [
        {
          label: "点数の分布",
          data: pdfData,
          borderColor: "rgb(75, 192, 192)",
          backgroundColor: "rgba(75, 192, 192, 0.5)",
          tension: 0.4,
        },
      ],
    });
  };

  const handleDeviationCalculate = () => {
    if (!results) return;

    const score = parseFloat(myScore);
    if (isNaN(score)) {
      alert("有効な点数を入力してください。");
      setDeviationResult(null);
      return;
    }

    const scoreDifference = score - results.average;

    // 標準偏差が0の場合、偏差値は計算できない
    if (results.stdDev === 0) {
      setDeviationResult({
        deviationValue: null,
        scoreDifference: scoreDifference,
      });
      return;
    }

    const deviationValue =
      ((score - results.average) / results.stdDev) * 10 + 50;

    setDeviationResult({
      // 小数点第二位で四捨五入して第一位まで表示
      deviationValue: parseFloat(deviationValue.toFixed(1)),
      scoreDifference: scoreDifference,
    });
  };

  const handlePrint = () => {
    // レポート作成に必要なデータが揃っているか確認
    if (
      !results ||
      !deviationResult ||
      !myScore ||
      !chartRef.current
    ) {
      alert(
        "レポートを作成するには、ステップ3まで計算を完了してください。"
      );
      return;
    }

    // グラフを画像(Base64)に変換
    const chartImage = chartRef.current.toBase64Image();

    // 1. 印刷用の非表示iframeを作成
    const iframe = document.createElement("iframe");
    iframe.style.position = "absolute";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    // 2. iframe内にドキュメントを書き込む
    const printDocument = iframe.contentWindow?.document;
    if (!printDocument) {
      console.error("印刷用ドキュメントにアクセスできませんでした。");
      document.body.removeChild(iframe);
      return;
    }

    // 3. レポート用のHTMLを生成
    const reportHtml = `
      <!DOCTYPE html>
      <html lang="ja">
        <head>
          <title>偏差値測定レポート</title>
          <style>
            body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; margin: 0; padding: 0; }
            .report-container { max-width: 680px; margin: 20px auto; padding: 20px; }
            h1 { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 40px; font-size: 24px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 40px; }
            .card { border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 1.5rem; text-align: center; }
            .card h2 { margin-top: 0; font-size: 16px; color: #4a5568; font-weight: normal; }
            .card p { font-size: 36px; font-weight: bold; margin: 0; color: #2d3748; }
            .chart-container { margin-top: 20px; text-align: center; }
            .chart-container h2 { font-size: 20px; margin-bottom: 15px; text-align: center; }
            .chart-container img { max-width: 100%; height: auto; border: 1px solid #e2e8f0; border-radius: 0.5rem; }
            .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #718096; }
          </style>
        </head>
        <body>
          <div class="report-container">
            <h1>偏差値測定レポート</h1>
            
            <div class="grid">
              <div class="card">
                <h2>あなたの点数</h2>
                <p>${myScore}</p>
              </div>
              <div class="card">
                <h2>あなたの偏差値</h2>
                <p>${deviationResult.deviationValue}</p>
              </div>
            </div>

            <div class="chart-container">
              <h2>正規分布曲線</h2>
              <img src="${chartImage}" alt="正規分布曲線" />
            </div>

            <div class="grid" style="margin-top: 40px;">
              <div class="card">
                <h2>平均点</h2>
                <p>${results.average.toFixed(2)}</p>
              </div>
              <div class="card">
                <h2>標準偏差</h2>
                <p>${results.stdDev.toFixed(2)}</p>
              </div>
            </div>

            <div class="footer">
              作成日: ${new Date().toLocaleDateString("ja-JP")}
            </div>
          </div>
        </body>
      </html>
    `;

    printDocument.open();
    printDocument.write(reportHtml);
    printDocument.close();

    // 4. 印刷ダイアログを開く
    // iframeの読み込み完了を待ってから印刷を実行
    iframe.onload = () => {
      iframe.contentWindow?.focus(); // 一部のブラウザで必要
      iframe.contentWindow?.print();

      // 5. 後処理としてiframeを削除
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 500);
    };
  };

  return (
    <main className="container mx-auto p-8">
      {/* --- UI Section (Not for printing) --- */}
      <div className="print:hidden">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold">偏差値を測定しよう！</h1>
          {results && (
            <button
              onClick={() => handlePrint()}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              レポートを印刷
            </button>
          )}
        </div>

        <div className="p-6 border rounded-lg shadow-md bg-white">
          <h2 className="text-2xl font-semibold">ステップ１</h2>
          <h3 className="text-xl mt-2 mb-4">点数ごとの人数を入力しよう</h3>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 text-left">点数</th>
                  <th className="border p-2 text-left">人数</th>
                  <th className="border p-2 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, index) => (
                  <tr key={index}>
                    <td className="border p-2">
                      <input type="number" name="score" value={row.score} onChange={(e) => handleInputChange(index, e)} className="w-full p-1 border rounded" placeholder="例: 85" />
                    </td>
                    <td className="border p-2">
                      <input type="number" name="count" value={row.count} onChange={(e) => handleInputChange(index, e)} className="w-full p-1 border rounded" placeholder="例: 10" />
                    </td>
                    <td className="border p-2 text-center">
                      <button onClick={() => removeRow(index)} className="text-red-500 hover:text-red-700 font-bold">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex space-x-2">
            <button onClick={addRow} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">行を追加</button>
            <button onClick={handleCalculate} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">計算する</button>
          </div>
        </div>

        {results && (
          <>
            {/* Step 2: Results and Distribution Graph */}
            <div className="mt-6 p-6 border rounded-lg shadow-md bg-white">
              <h2 className="text-2xl font-semibold">ステップ2</h2>
              <h3 className="text-xl mt-2 mb-4">計算結果と点数の分布</h3>

              <div className="grid md:grid-cols-2 gap-8 items-center">
                {/* Calculation Results */}
                <div className="space-y-3 text-lg bg-gray-50 p-4 rounded-lg">
                  <p>
                    <strong>平均点:</strong>
                    <span className="ml-2 font-mono text-xl text-blue-600">
                      {results.average.toFixed(2)}
                    </span>
                  </p>
                  <p>
                    <strong>標準偏差:</strong>
                    <span className="ml-2 font-mono text-xl text-blue-600">
                      {results.stdDev.toFixed(2)}
                    </span>
                  </p>
                </div>

                {/* Graph */}
                <div className="w-full">
                  {chartData ? (
                    <Line
                      ref={chartRef}
                      data={chartData}
                      options={{
                        responsive: true,
                        plugins: {
                          legend: { display: false },
                          title: { display: true, text: "正規分布曲線" },
                        },
                        scales: {
                          y: { display: false },
                          x: { title: { display: true, text: "点数" } },
                        },
                      }}
                    />
                  ) : (
                    <div className="text-center text-gray-500 p-4 border-dashed border-2 rounded-lg">
                      <p>
                        {results.stdDev === 0
                          ? "標準偏差が0のため、分布グラフは表示できません。"
                          : "グラフデータを生成できませんでした。"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Step 3: Calculate Deviation Score */}
            <div className="mt-6 p-6 border rounded-lg shadow-md bg-white">
              <h2 className="text-2xl font-semibold">ステップ3</h2>
              <h3 className="text-xl mt-2 mb-4">自分の偏差値を確認しよう</h3>

              <div className="flex flex-wrap items-center gap-4">
                <input
                  type="number"
                  value={myScore}
                  onChange={(e) => {
                    setMyScore(e.target.value);
                    setDeviationResult(null); // 入力し直したら結果をリセット
                  }}
                  placeholder="自分の点数を入力"
                  className="p-2 border rounded w-48"
                />
                <button
                  onClick={handleDeviationCalculate}
                  className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-400"
                  disabled={!myScore}
                >
                  偏差値を計算
                </button>
              </div>

              {deviationResult && (
                <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
                  <p className="text-2xl font-bold text-blue-800">
                    {deviationResult.deviationValue !== null
                      ? `あなたの偏差値: ${deviationResult.deviationValue}`
                      : "偏差値は計算できません (標準偏差が0です)"}
                  </p>
                  <p className="mt-2 text-lg text-gray-700">
                    {deviationResult.scoreDifference > 0 &&
                      `平均点より ${deviationResult.scoreDifference.toFixed(
                        2
                      )} 点高いです。`}
                    {deviationResult.scoreDifference < 0 &&
                      `平均点より ${Math.abs(
                        deviationResult.scoreDifference
                      ).toFixed(2)} 点低いです。`}
                    {deviationResult.scoreDifference === 0 &&
                      "平均点と同じ点数です。"}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}