import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useForm } from 'react-hook-form';
import { FiUpload, FiCheck, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { uploadImage } from '../utils/api';
import { ImageUploadData } from '../types';

export default function UploadPage() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [boundingBox, setBoundingBox] = useState({ x: 0, y: 0, width: 100, height: 100 });

  const { register, handleSubmit, formState: { errors }, reset } = useForm<ImageUploadData>();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.bmp']
    },
    maxFiles: 1
  });

  const onSubmit = async (data: ImageUploadData) => {
    if (!imageFile) {
      toast.error('Por favor, selecione uma imagem');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      
      // Add all form data
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          if (key === 'boundingBox') {
            formData.append(key, JSON.stringify(boundingBox));
          } else {
            formData.append(key, value.toString());
          }
        }
      });

      const response = await uploadImage(formData);
      
      if (response.success) {
        toast.success('Imagem enviada com sucesso!');
        reset();
        setImageFile(null);
        setImagePreview('');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar imagem');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Upload de Imagem Endoscópica</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Image Upload */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Imagem</h2>
          
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
          >
            <input {...getInputProps()} />
            {imagePreview ? (
              <div>
                <img src={imagePreview} alt="Preview" className="max-w-full max-h-96 mx-auto mb-4" />
                <p className="text-sm text-gray-600">{imageFile?.name}</p>
              </div>
            ) : (
              <div>
                <FiUpload className="mx-auto text-4xl text-gray-400 mb-4" />
                <p className="text-gray-600">
                  {isDragActive ? 'Solte a imagem aqui' : 'Arraste uma imagem ou clique para selecionar'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Required Fields */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Campos Obrigatórios</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Categoria *</label>
              <select
                {...register('category', { required: 'Categoria é obrigatória' })}
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
              {errors.category && <p className="text-red-500 text-sm">{errors.category.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Sexo *</label>
              <select
                {...register('sex', { required: 'Sexo é obrigatório' })}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Selecione...</option>
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
              </select>
              {errors.sex && <p className="text-red-500 text-sm">{errors.sex.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Faixa Etária *</label>
              <select
                {...register('ageRange', { required: 'Faixa etária é obrigatória' })}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Selecione...</option>
                <option value="0-20">0-20 anos</option>
                <option value="21-40">21-40 anos</option>
                <option value="41-60">41-60 anos</option>
                <option value="61-80">61-80 anos</option>
                <option value=">80">&gt;80 anos</option>
              </select>
              {errors.ageRange && <p className="text-red-500 text-sm">{errors.ageRange.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Localização *</label>
              <input
                type="text"
                {...register('location', { required: 'Localização é obrigatória' })}
                className="w-full p-2 border rounded-md"
                placeholder="Ex: Cólon ascendente"
              />
              {errors.location && <p className="text-red-500 text-sm">{errors.location.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Confiança *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                {...register('confidence', { 
                  required: 'Confiança é obrigatória',
                  min: { value: 0, message: 'Mínimo 0' },
                  max: { value: 1, message: 'Máximo 1' }
                })}
                className="w-full p-2 border rounded-md"
                placeholder="0.0 - 1.0"
              />
              {errors.confidence && <p className="text-red-500 text-sm">{errors.confidence.message}</p>}
            </div>
          </div>

          {/* Bounding Box (simplified for now) */}
          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">Bounding Box *</label>
            <p className="text-sm text-gray-600 mb-2">
              Defina as coordenadas da lesão (x, y, largura, altura)
            </p>
            <div className="grid grid-cols-4 gap-2">
              <input
                type="number"
                value={boundingBox.x}
                onChange={(e) => setBoundingBox({...boundingBox, x: parseInt(e.target.value)})}
                className="p-2 border rounded-md"
                placeholder="X"
              />
              <input
                type="number"
                value={boundingBox.y}
                onChange={(e) => setBoundingBox({...boundingBox, y: parseInt(e.target.value)})}
                className="p-2 border rounded-md"
                placeholder="Y"
              />
              <input
                type="number"
                value={boundingBox.width}
                onChange={(e) => setBoundingBox({...boundingBox, width: parseInt(e.target.value)})}
                className="p-2 border rounded-md"
                placeholder="Largura"
              />
              <input
                type="number"
                value={boundingBox.height}
                onChange={(e) => setBoundingBox({...boundingBox, height: parseInt(e.target.value)})}
                className="p-2 border rounded-md"
                placeholder="Altura"
              />
            </div>
          </div>
        </div>

        {/* Optional Classifications */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Classificações Opcionais</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Classificação Paris</label>
              <select {...register('parisClassification')} className="w-full p-2 border rounded-md">
                <option value="">Não aplicável</option>
                <option value="0-Ip">0-Ip - Pediculado</option>
                <option value="0-Is">0-Is - Séssil</option>
                <option value="0-Isp">0-Isp - Sub-pediculado</option>
                <option value="0-IIa">0-IIa - Elevado</option>
                <option value="0-IIb">0-IIb - Plano</option>
                <option value="0-IIc">0-IIc - Deprimido</option>
                <option value="0-III">0-III - Escavado</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Classificação JNET</label>
              <select {...register('jnetClassification')} className="w-full p-2 border rounded-md">
                <option value="">Não aplicável</option>
                <option value="Type1">Type 1 - Hiperplásico</option>
                <option value="Type2A">Type 2A - Adenoma baixo grau</option>
                <option value="Type2B">Type 2B - Adenoma alto grau</option>
                <option value="Type3">Type 3 - Carcinoma invasivo</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Padrão Kudo</label>
              <select {...register('kudoPitPattern')} className="w-full p-2 border rounded-md">
                <option value="">Não aplicável</option>
                <option value="I">I - Normal</option>
                <option value="II">II - Estrelado/papilar</option>
                <option value="IIIS">IIIS - Tubular pequeno</option>
                <option value="IIIL">IIIL - Tubular grande</option>
                <option value="IV">IV - Ramificado</option>
                <option value="Vi">Vi - Irregular</option>
                <option value="Vn">Vn - Amorfo</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Classificação NICE</label>
              <select {...register('niceClassification')} className="w-full p-2 border rounded-md">
                <option value="">Não aplicável</option>
                <option value="Type1">Type 1 - Hiperplásico</option>
                <option value="Type2">Type 2 - Adenoma</option>
                <option value="Type3">Type 3 - Carcinoma invasivo</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Classificação Forrest</label>
              <select {...register('forrestClassification')} className="w-full p-2 border rounded-md">
                <option value="">Não aplicável</option>
                <option value="Ia">Ia - Sangramento arterial ativo</option>
                <option value="Ib">Ib - Sangramento venoso ativo</option>
                <option value="IIa">IIa - Vaso visível</option>
                <option value="IIb">IIb - Coágulo aderente</option>
                <option value="IIc">IIc - Hematina na base</option>
                <option value="III">III - Base limpa</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Modo de Imagem</label>
              <select {...register('imagingMode')} className="w-full p-2 border rounded-md">
                <option value="white-light">Luz branca</option>
                <option value="NBI">NBI</option>
                <option value="chromoendoscopy">Cromoendoscopia</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Tipo de Procedimento</label>
              <select {...register('procedureType')} className="w-full p-2 border rounded-md">
                <option value="">Selecione...</option>
                <option value="EGD">EGD</option>
                <option value="colonoscopy">Colonoscopia</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">Notas Adicionais</label>
            <textarea
              {...register('additionalNotes')}
              className="w-full p-2 border rounded-md"
              rows={3}
              placeholder="Observações clínicas relevantes..."
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={uploading}
            className={`px-6 py-3 rounded-md text-white font-medium flex items-center gap-2
              ${uploading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
              }`}
          >
            {uploading ? (
              <>Enviando...</>
            ) : (
              <>
                <FiUpload /> Enviar Imagem
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}