import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { FiSave, FiPlus, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getAnnotations, createAnnotation, updateAnnotation, deleteAnnotation } from '../utils/api.ts';
import { Annotation } from '../types';

export default function AnnotationPage() {
  const { imageId } = useParams<{ imageId: string }>();
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  const [isNewAnnotation, setIsNewAnnotation] = useState(false);

  const { register, handleSubmit, reset, setValue } = useForm();

  useEffect(() => {
    if (imageId) {
      loadAnnotations();
    }
  }, [imageId]);

  const loadAnnotations = async () => {
    try {
      setLoading(true);
      const response = await getAnnotations(imageId!);
      setAnnotations(response.annotations);
    } catch (error) {
      toast.error('Erro ao carregar anotações');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: any) => {
    try {
      if (isNewAnnotation) {
        await createAnnotation(imageId!, data);
        toast.success('Anotação criada com sucesso');
      } else if (selectedAnnotation) {
        await updateAnnotation(selectedAnnotation.id, data);
        toast.success('Anotação atualizada com sucesso');
      }
      
      loadAnnotations();
      reset();
      setSelectedAnnotation(null);
      setIsNewAnnotation(false);
    } catch (error) {
      toast.error('Erro ao salvar anotação');
    }
  };

  const handleDelete = async (annotationId: string) => {
    if (window.confirm('Tem certeza que deseja deletar esta anotação?')) {
      try {
        await deleteAnnotation(annotationId);
        toast.success('Anotação deletada com sucesso');
        loadAnnotations();
      } catch (error) {
        toast.error('Erro ao deletar anotação');
      }
    }
  };

  const selectAnnotation = (annotation: Annotation) => {
    setSelectedAnnotation(annotation);
    setIsNewAnnotation(false);
    
    // Populate form
    setValue('lesionId', annotation.lesionId);
    setValue('category', annotation.category);
    setValue('bbox', annotation.bbox);
    setValue('parisClassification', annotation.parisClassification);
    setValue('jnetClassification', annotation.jnetClassification);
    setValue('kudoPitPattern', annotation.kudoPitPattern);
    setValue('niceClassification', annotation.niceClassification);
    setValue('forrestClassification', annotation.forrestClassification);
    setValue('severity', annotation.severity);
    setValue('confidence', annotation.confidence);
    setValue('clinicalDescription', annotation.clinicalDescription);
  };

  const startNewAnnotation = () => {
    reset();
    setSelectedAnnotation(null);
    setIsNewAnnotation(true);
    
    // Set next lesion ID
    const maxLesionId = Math.max(...annotations.map(a => a.lesionId), 0);
    setValue('lesionId', maxLesionId + 1);
  };

  if (loading) {
    return <div className="text-center py-8">Carregando anotações...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Anotação de Imagem</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Image Preview */}
        <div className="lg:col-span-2">
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Imagem</h2>
            <div className="bg-gray-100 rounded-lg p-4">
              {/* In production, this would display the actual image */}
              <div className="aspect-square bg-gray-300 rounded flex items-center justify-center">
                <span className="text-gray-600">Imagem ID: {imageId}</span>
              </div>
            </div>

            {/* Annotations List */}
            <div className="mt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Anotações</h3>
                <button
                  onClick={startNewAnnotation}
                  className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  <FiPlus size={16} />
                  Nova Anotação
                </button>
              </div>

              <div className="space-y-2">
                {annotations.map((annotation) => (
                  <div
                    key={annotation.id}
                    onClick={() => selectAnnotation(annotation)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedAnnotation?.id === annotation.id
                        ? 'bg-blue-50 border-2 border-blue-500'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-medium">Lesão #{annotation.lesionId}</span>
                        <span className="ml-2 text-sm text-gray-600">{annotation.category}</span>
                        {annotation.confidence && (
                          <span className="ml-2 text-sm text-gray-500">
                            ({(annotation.confidence * 100).toFixed(0)}% confiança)
                          </span>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(annotation.id);
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Annotation Form */}
        <div className="lg:col-span-1">
          <div className="bg-white p-4 rounded-lg shadow-md sticky top-4">
            <h2 className="text-xl font-semibold mb-4">
              {isNewAnnotation ? 'Nova Anotação' : 'Editar Anotação'}
            </h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">ID da Lesão</label>
                <input
                  type="number"
                  {...register('lesionId', { required: true })}
                  className="w-full p-2 border rounded-md"
                  readOnly={!isNewAnnotation}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Categoria *</label>
                <select
                  {...register('category', { required: true })}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="">Selecione...</option>
                  <option value="polyp">Pólipo</option>
                  <option value="ulcer">Úlcera</option>
                  <option value="erosion">Erosão</option>
                  <option value="bleeding">Sangramento</option>
                  <option value="tumor">Tumor</option>
                  <option value="inflammation">Inflamação</option>
                  <option value="normal">Normal</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Severidade</label>
                <select {...register('severity')} className="w-full p-2 border rounded-md">
                  <option value="">Não especificada</option>
                  <option value="mild">Leve</option>
                  <option value="moderate">Moderada</option>
                  <option value="severe">Severa</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Confiança</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  {...register('confidence')}
                  className="w-full p-2 border rounded-md"
                  placeholder="0.0 - 1.0"
                />
              </div>

              {/* Classification fields */}
              <div>
                <label className="block text-sm font-medium mb-1">Paris</label>
                <select {...register('parisClassification')} className="w-full p-2 border rounded-md">
                  <option value="">N/A</option>
                  <option value="0-Ip">0-Ip</option>
                  <option value="0-Is">0-Is</option>
                  <option value="0-Isp">0-Isp</option>
                  <option value="0-IIa">0-IIa</option>
                  <option value="0-IIb">0-IIb</option>
                  <option value="0-IIc">0-IIc</option>
                  <option value="0-III">0-III</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Descrição Clínica</label>
                <textarea
                  {...register('clinicalDescription')}
                  className="w-full p-2 border rounded-md"
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <FiSave size={16} />
                  Salvar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    reset();
                    setSelectedAnnotation(null);
                    setIsNewAnnotation(false);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}