import React, { useState, useEffect } from 'react';
import {
  Building2,
  MapPin,
  Calendar,
  UserCheck,
  Search,
  RefreshCw,
  ShieldCheck,
  Filter,
  Eye,
  Trash2,
  Download,
  Loader2,
  X
} from 'lucide-react';
import { supabase } from '../services/apiService';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';

interface AuditPhotoRecord {
  id: string;
  client_name: string;
  premise_type: string;
  tag_key: string;
  tag_label: string;
  photo_url: string;
  file_path: string;
  latitude: number | null;
  longitude: number | null;
  captured_by: string;
  captured_at: string;
}

export default function InspectionGalleryPage() {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<AuditPhotoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [filterClient, setFilterClient] = useState('');
  const [filterPremise, setFilterPremise] = useState('ALL');
  const [previewPhoto, setPreviewPhoto] = useState<AuditPhotoRecord | null>(null);

  const isPrivileged = user?.role === Role.ADMIN || user?.role === Role.SR_FIELD_EXECUTIVE;

  const fetchAuditPhotos = async () => {
    setLoading(true);
    let query = supabase
      .from('site_visit_photos')
      .select('*')
      .order('captured_at', { ascending: false })
      .limit(100);

    if (filterPremise !== 'ALL') {
      query = query.eq('premise_type', filterPremise);
    }

    const { data, error } = await query;
    if (!error && data) {
      setPhotos(data as AuditPhotoRecord[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAuditPhotos();
  }, [filterPremise]);

  // Clean filename generator and blob download trigger
  const handleDownloadPhoto = async (photo: AuditPhotoRecord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    try {
      setDownloadingId(photo.id);

      const response = await fetch(photo.photo_url);
      if (!response.ok) throw new Error('Failed to fetch image stream');

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const datePart = photo.captured_at
        ? new Date(photo.captured_at).toISOString().split('T')[0]
        : 'AUDIT';
      const cleanClient = photo.client_name.replace(/[^A-Za-z0-9]/g, '_').toUpperCase();
      const cleanTag = photo.tag_label.replace(/[^A-Za-z0-9]/g, '_').toUpperCase();
      const filename = `VSF_${cleanClient}_${cleanTag}_${datePart}.jpg`;

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err: any) {
      alert(`Download failed: ${err.message || 'Could not download photo'}`);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDeletePhoto = async (photo: AuditPhotoRecord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const confirmed = window.confirm(
      `Permanently delete this audit photo for "${photo.client_name}" (${photo.tag_label})?`
    );
    if (!confirmed) return;

    setDeletingId(photo.id);

    try {
      // 1. Delete physical object from storage bucket
      if (photo.file_path) {
        await supabase.storage.from('client-vault').remove([photo.file_path]);
      }

      // 2. Delete database audit record
      const { error: dbErr } = await supabase
        .from('site_visit_photos')
        .delete()
        .eq('id', photo.id);

      if (dbErr) throw dbErr;

      // 3. Update local UI list
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));

      if (previewPhoto?.id === photo.id) {
        setPreviewPhoto(null);
      }
    } catch (err: any) {
      alert(`Delete failed: ${err.message || 'Could not delete audit record'}`);
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = photos.filter((p) =>
    filterClient ? p.client_name.toLowerCase().includes(filterClient.toLowerCase()) : true
  );

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black uppercase text-slate-900 tracking-tight">
              Site Inspection Photographic Stream
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-mono font-bold">
              HQ / Field Admin
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Geotagged security &amp; facility inspection evidence captured on-site by field staff.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchAuditPhotos}
          className="px-3.5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition flex items-center gap-2 self-start md:self-auto cursor-pointer"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Stream</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-3 text-slate-400" size={14} />
          <input
            type="text"
            placeholder="Search by client or premise..."
            value={filterClient}
            onChange={(e) => setFilterClient(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#FAF9F5] border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-red-700"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto sm:col-span-2">
          {['ALL', 'COLONY', 'INDUSTRY', 'SCHOOL', 'UNIVERSITY', 'CORPORATE'].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setFilterPremise(type)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold uppercase transition shrink-0 ${
                filterPremise === type
                  ? 'bg-red-700 text-white shadow-xs'
                  : 'bg-[#FAF9F5] text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Photo Stream Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-2">
          <ShieldCheck size={32} className="mx-auto text-slate-300" />
          <p className="text-xs font-bold text-slate-500 uppercase">
            No inspection photos found for this filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => setPreviewPhoto(item)}
              className="group bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:border-red-700 transition cursor-pointer flex flex-col justify-between"
            >
              <div className="relative aspect-video bg-black overflow-hidden">
                <img
                  src={item.photo_url}
                  alt={item.tag_label}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-[9px] font-mono font-bold text-white uppercase">
                  {item.premise_type}
                </div>

                <div className="absolute top-2 right-2 flex items-center gap-1.5">
                  {item.latitude && (
                    <span className="px-1.5 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 text-[8px] font-mono font-bold flex items-center gap-1">
                      <MapPin size={8} />
                      <span>GPS</span>
                    </span>
                  )}

                  {/* Quick Card Download Button */}
                  <button
                    type="button"
                    disabled={downloadingId === item.id}
                    onClick={(e) => handleDownloadPhoto(item, e)}
                    title="Download Inspection Photo"
                    className="p-1 rounded-md bg-black/60 hover:bg-slate-900 text-white/90 hover:text-white transition cursor-pointer"
                  >
                    {downloadingId === item.id ? (
                      <Loader2 size={11} className="animate-spin text-amber-300" />
                    ) : (
                      <Download size={11} />
                    )}
                  </button>

                  {/* Delete Button (Privileged Roles) */}
                  {isPrivileged && (
                    <button
                      type="button"
                      disabled={deletingId === item.id}
                      onClick={(e) => handleDeletePhoto(item, e)}
                      title="Delete Photo Record"
                      className="p-1 rounded-md bg-black/60 hover:bg-red-700 text-white/90 hover:text-white transition cursor-pointer"
                    >
                      {deletingId === item.id ? (
                        <Loader2 size={11} className="animate-spin text-amber-300" />
                      ) : (
                        <Trash2 size={11} />
                      )}
                    </button>
                  )}
                </div>

                <div className="absolute bottom-2 left-2 right-2 text-white">
                  <p className="text-xs font-bold uppercase truncate drop-shadow-xs">
                    {item.tag_label}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-white space-y-1 border-t border-slate-100">
                <p className="text-xs font-black uppercase text-slate-900 truncate">
                  {item.client_name}
                </p>

                <div className="flex items-center justify-between text-[9.5px] font-mono text-slate-500 pt-1 border-t border-slate-50">
                  <span className="truncate">By: {item.captured_by}</span>
                  <span className="shrink-0">{new Date(item.captured_at).toLocaleDateString('en-GB')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full Inspection Evidence Modal */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-video bg-black">
              <img
                src={previewPhoto.photo_url}
                alt={previewPhoto.tag_label}
                className="w-full h-full object-contain"
              />
            </div>

            <div className="p-5 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-black uppercase text-slate-900">
                    {previewPhoto.tag_label}
                  </h3>
                  <p className="text-xs font-bold text-red-700 uppercase">
                    {previewPhoto.client_name}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-800 text-[10px] font-mono font-bold uppercase">
                  {previewPhoto.premise_type}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 p-3 bg-[#FAF9F5] rounded-xl border border-slate-200 text-xs font-mono">
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase font-bold">Inspector</span>
                  <span className="font-bold text-slate-800">{previewPhoto.captured_by}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase font-bold">Timestamp</span>
                  <span className="font-bold text-slate-800">
                    {new Date(previewPhoto.captured_at).toLocaleString('en-IN')}
                  </span>
                </div>
                {previewPhoto.latitude && (
                  <div className="col-span-2 pt-1 border-t border-slate-200/60 flex items-center gap-1.5 text-emerald-800">
                    <MapPin size={12} className="text-emerald-700" />
                    <span>Lat: {previewPhoto.latitude.toFixed(6)}, Lng: {previewPhoto.longitude?.toFixed(6)}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-2 gap-2">
                <div className="flex items-center gap-2">
                  {/* Modal Download Button */}
                  <button
                    type="button"
                    disabled={downloadingId === previewPhoto.id}
                    onClick={() => handleDownloadPhoto(previewPhoto)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-slate-200"
                  >
                    {downloadingId === previewPhoto.id ? (
                      <Loader2 size={13} className="animate-spin text-slate-700" />
                    ) : (
                      <Download size={13} />
                    )}
                    <span>Download HD Photo</span>
                  </button>

                  {/* Modal Delete Button (Privileged Roles) */}
                  {isPrivileged && (
                    <button
                      type="button"
                      disabled={deletingId === previewPhoto.id}
                      onClick={() => handleDeletePhoto(previewPhoto)}
                      className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-red-200"
                    >
                      {deletingId === previewPhoto.id ? (
                        <Loader2 size={13} className="animate-spin text-red-700" />
                      ) : (
                        <Trash2 size={13} />
                      )}
                      <span>Delete</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setPreviewPhoto(null)}
                  className="px-5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Close Inspection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
