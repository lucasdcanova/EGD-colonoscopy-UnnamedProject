import React, { useEffect, useState } from 'react';
import { FiDownload, FiRefreshCw } from 'react-icons/fi';
import { getDatasetStats, exportDataset } from '../utils/api.ts';
import toast from 'react-hot-toast';

export default function DatasetPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await getDatasetStats();
      setStats(response.stats);
    } catch (error) {
      toast.error('Erro ao carregar estatísticas');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'coco' | 'jsonl') => {
    try {
      setExporting(true);
      const data = await exportDataset(format);
      
      if (format === 'jsonl') {
        // Download JSONL file
        const blob = new Blob([data], { type: 'application/x-ndjson' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dataset_${new Date().toISOString().split('T')[0]}.jsonl`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        // Download COCO JSON
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dataset_coco_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
      
      toast.success(`Dataset exportado em formato ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Erro ao exportar dataset');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Carregando estatísticas...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dataset Overview</h1>
        <button
          onClick={loadStats}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md"
        >
          <FiRefreshCw size={16} />
          Atualizar
        </button>
      </div>

      {/* Dataset Splits */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Divisão do Dataset</h2>
        <div className="grid grid-cols-3 gap-4">
          {stats?.datasetSplits?.map((split: any) => (
            <div key={split.dataset_split} className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{split.count}</div>
              <div className="text-sm text-gray-600 uppercase">{split.dataset_split}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Category Distribution */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Distribuição por Categoria</h2>
        <div className="space-y-2">
          {stats?.categoryDistribution?.map((cat: any) => (
            <div key={cat.category} className="flex items-center justify-between">
              <span className="font-medium capitalize">{cat.category}</span>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  Total: {cat.total}
                </span>
                <div className="flex gap-2 text-xs">
                  <span className="px-2 py-1 bg-blue-100 rounded">Train: {cat.train_count}</span>
                  <span className="px-2 py-1 bg-green-100 rounded">Val: {cat.val_count}</span>
                  <span className="px-2 py-1 bg-orange-100 rounded">Test: {cat.test_count}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Classification Usage */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Uso de Classificações</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {stats?.classificationUsage && Object.entries(stats.classificationUsage).map(([key, value]: [string, any]) => {
            if (key === 'total_images') return null;
            const percentage = ((value / stats.classificationUsage.total_images) * 100).toFixed(1);
            return (
              <div key={key} className="text-center">
                <div className="text-lg font-semibold">{percentage}%</div>
                <div className="text-sm text-gray-600">{key.replace('_count', '').toUpperCase()}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quality Metrics */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Métricas de Qualidade</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-600">Confiança Média</div>
            <div className="text-xl font-semibold">
              {(stats?.qualityMetrics?.avg_confidence * 100).toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Confiança Mínima</div>
            <div className="text-xl font-semibold">
              {(stats?.qualityMetrics?.min_confidence * 100).toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Confiança Máxima</div>
            <div className="text-xl font-semibold">
              {(stats?.qualityMetrics?.max_confidence * 100).toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Desvio Padrão</div>
            <div className="text-xl font-semibold">
              {(stats?.qualityMetrics?.confidence_stddev * 100).toFixed(2)}%
            </div>
          </div>
        </div>
      </div>

      {/* Export Options */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Exportar Dataset</h2>
        <div className="flex gap-4">
          <button
            onClick={() => handleExport('coco')}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            <FiDownload size={16} />
            Exportar COCO
          </button>
          <button
            onClick={() => handleExport('jsonl')}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
          >
            <FiDownload size={16} />
            Exportar JSONL (MedGemma)
          </button>
        </div>
      </div>
    </div>
  );
}