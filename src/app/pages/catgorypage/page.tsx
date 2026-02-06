'use client';
import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase';
import { MdDoneAll, MdLayers, MdWarning, MdFolder, MdDelete, MdClose, MdEdit, MdCheck, MdSave, MdAdd } from 'react-icons/md';
import toast from 'react-hot-toast';

export default function CategoryManager() {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  
  // MODAL STATES
  const [showDeleteModal, setShowDeleteModal] = useState<{id: string, name: string} | null>(null);
  const [showEditModal, setShowEditModal] = useState<{id: string, name: string, level: string, parent_id: string} | null>(null);
  const [editName, setEditName] = useState('');

  const [selection, setSelection] = useState({
    mainId: '', mainNew: '', subId: '', subNew: '', innerNew: ''
  });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const { data } = await supabase.from('categories').select('*').order('name');
    if (data) setAllCategories(data);
  };

  // --- STRICT DUPLICATE LOGIC ---
  const isMainDuplicate = selection.mainNew.trim() !== '' && 
    allCategories.some(c => c.level === 'main' && c.name.toLowerCase() === selection.mainNew.toLowerCase());

  const activeMainId = selection.mainId;
  const isSubDuplicate = selection.subNew.trim() !== '' && 
    allCategories.some(c => c.level === 'sub' && c.parent_id === activeMainId && c.name.toLowerCase() === selection.subNew.toLowerCase());

  const activeSubId = selection.subId;
  const isInnerDuplicate = selection.innerNew.trim() !== '' && 
    allCategories.some(c => c.level === 'inner' && c.parent_id === activeSubId && c.name.toLowerCase() === selection.innerNew.toLowerCase());

  const isSaveDisabled = loading || isMainDuplicate || isSubDuplicate || isInnerDuplicate || (!selection.mainId && !selection.mainNew);

  // --- EDIT MODAL DUPLICATE LOGIC ---
  const isEditDuplicate = showEditModal && allCategories.some(c => 
    c.level === showEditModal.level && 
    c.parent_id === showEditModal.parent_id && 
    c.name.toLowerCase() === editName.toLowerCase() && 
    c.id !== showEditModal.id
  );

  const handleProcess = async () => {
    if (isSaveDisabled) return;
    setLoading(true);
    try {
      let finalMainId = selection.mainId;
      if (!finalMainId && selection.mainNew) {
        const { data, error } = await supabase.from('categories').insert([{ name: selection.mainNew, level: 'main' }]).select().single();
        if (error) throw error;
        finalMainId = data.id;
      }

      let finalSubId = selection.subId;
      if (!finalSubId && selection.subNew) {
        const { data, error } = await supabase.from('categories').insert([{ name: selection.subNew, level: 'sub', parent_id: finalMainId }]).select().single();
        if (error) throw error;
        finalSubId = data.id;
      }

      if (selection.innerNew && (finalSubId || selection.subId)) {
        const targetSubId = finalSubId || selection.subId;
        const { error } = await supabase.from('categories').insert([{ name: selection.innerNew, level: 'inner', parent_id: targetSubId }]);
        if (error) throw error;
      }

      toast.success("Saved successfully");
      setSelection({ mainId: '', mainNew: '', subId: '', subNew: '', innerNew: '' });
      fetchAll();
    } catch (err: any) { 
      toast.error(err.message); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleUpdateName = async () => {
    if (!showEditModal || isEditDuplicate || !editName.trim()) return;
    setLoading(true);
    const { error } = await supabase.from('categories').update({ name: editName }).eq('id', showEditModal.id);
    if (error) toast.error("Update failed");
    else {
        toast.success("Renamed successfully");
        setShowEditModal(null);
        fetchAll();
    }
    setLoading(false);
  };

  const confirmDelete = async () => {
    if (!showDeleteModal) return;
    const { error } = await supabase.from('categories').delete().eq('id', showDeleteModal.id);
    if (error) toast.error("Delete failed");
    else {
      toast.success("Deleted permanently");
      setShowDeleteModal(null);
      fetchAll();
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-10 font-sans text-slate-900">
      
      {/* --- POPUP EDIT MODAL --- */}
      {showEditModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl space-y-6 border border-slate-100">
            <div className="text-center">
              <div className="w-16 h-16 bg-slate-50 text-[#2c4305] rounded-2xl flex items-center justify-center mx-auto text-2xl mb-4"><MdEdit /></div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Edit Name</h3>
            </div>
            <div className="space-y-2">
                <input autoFocus className={`w-full p-4 rounded-xl bg-slate-50 border-2 outline-none font-bold text-slate-900 ${isEditDuplicate ? 'border-red-500' : 'border-slate-100 focus:border-[#2c4305]'}`} value={editName} onChange={(e) => setEditName(e.target.value)} />
                {isEditDuplicate && <p className="text-[10px] text-red-500 font-bold uppercase text-center">Name already exists here!</p>}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowEditModal(null)} className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-500 text-[10px] font-black uppercase">Cancel</button>
              <button disabled={isEditDuplicate || !editName.trim() || loading} onClick={handleUpdateName} className="flex-1 py-3 rounded-xl bg-[#2c4305] text-white text-[10px] font-black uppercase disabled:opacity-30 transition-all shadow-lg shadow-emerald-100">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* --- POPUP DELETE MODAL --- */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[99] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto text-2xl mb-4"><MdDelete /></div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Delete Item?</h3>
              <p className="text-[10px] text-slate-500 font-bold mt-2 uppercase">Removing "{showDeleteModal.name}" deletes all children.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(null)} className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-500 text-[10px] font-black uppercase">Cancel</button>
              <button onClick={confirmDelete} className="flex-1 py-3 rounded-xl bg-red-600 text-white text-[10px] font-black uppercase shadow-lg shadow-red-100">Confirm Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* 1. INPUT FORM */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden">
        <div className="p-8 bg-[#2c4305] text-white flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tighter">Category Architect</h2>
            <p className="text-[10px] font-bold opacity-60 uppercase tracking-[0.2em]">Manage your hierarchy</p>
          </div>
          <MdLayers size={32} className="opacity-20" />
        </div>

        <div className="p-10 grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* MAIN */}
          <div className="space-y-4">
            <label className="text-[11px] font-black uppercase text-slate-400">Main Category</label>
            <select className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl text-sm font-black text-slate-900 outline-none" value={selection.mainId} onChange={(e) => setSelection({...selection, mainId: e.target.value, subId: '', mainNew: ''})}>
              <option value="">+ NEW MAIN</option>
              {allCategories.filter(c => c.level === 'main').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {!selection.mainId && (
              <div className="space-y-2">
                <input placeholder="Type Name..." className={`w-full p-4 rounded-2xl text-sm font-bold border-2 outline-none ${isMainDuplicate ? 'border-red-500 bg-red-50' : 'border-slate-100 focus:border-[#2c4305]'}`} value={selection.mainNew} onChange={(e) => setSelection({...selection, mainNew: e.target.value})}/>
                {isMainDuplicate && <p className="text-[9px] text-red-500 font-black uppercase tracking-widest text-center">Duplicate Main!</p>}
              </div>
            )}
          </div>

          {/* SUB */}
          <div className="space-y-4">
            <label className="text-[11px] font-black uppercase text-slate-400">Sub Category</label>
            <select disabled={!selection.mainId && !selection.mainNew} className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl text-sm font-black text-slate-900 outline-none disabled:opacity-20" value={selection.subId} onChange={(e) => setSelection({...selection, subId: e.target.value, subNew: ''})}>
              <option value="">+ NEW SUB</option>
              {allCategories.filter(c => c.parent_id === selection.mainId && c.level === 'sub').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {!selection.subId && (selection.mainId || selection.mainNew) && (
              <div className="space-y-2">
                <input placeholder="Type Name..." className={`w-full p-4 rounded-2xl text-sm font-bold border-2 outline-none ${isSubDuplicate ? 'border-red-500 bg-red-50' : 'border-slate-100 focus:border-[#2c4305]'}`} value={selection.subNew} onChange={(e) => setSelection({...selection, subNew: e.target.value})}/>
                {isSubDuplicate && <p className="text-[9px] text-red-500 font-black uppercase tracking-widest text-center">Duplicate Sub!</p>}
              </div>
            )}
          </div>

          {/* INNER */}
          <div className="space-y-4">
            <label className="text-[11px] font-black uppercase text-slate-400">Inner Category</label>
            <div className="space-y-2">
              <input disabled={!selection.subId && !selection.subNew} className={`w-full bg-slate-50 border-2 p-4 rounded-2xl text-sm font-black text-slate-900 outline-none disabled:opacity-20 ${isInnerDuplicate ? 'border-red-500 bg-red-50' : 'border-slate-100 focus:border-[#2c4305]'}`} placeholder="Item Name..." value={selection.innerNew} onChange={(e) => setSelection({...selection, innerNew: e.target.value})}/>
              {isInnerDuplicate && <p className="text-[9px] text-red-500 font-black uppercase tracking-widest text-center">Duplicate Item!</p>}
            </div>
          </div>
        </div>

        <div className="px-10 pb-10">
          <button onClick={handleProcess} disabled={isSaveDisabled} className={`w-full p-6 rounded-3xl font-black uppercase text-xs tracking-[0.4em] flex items-center justify-center gap-4 transition-all duration-300 ${isSaveDisabled ? 'bg-slate-100 text-slate-300' : 'bg-[#2c4305] text-white hover:bg-black shadow-xl shadow-emerald-100'}`}>
             {isSaveDisabled && !loading ? "CHECK ERRORS" : <><MdAdd size={24}/> Add To List</>}
          </button>
        </div>
      </div>

      {/* 2. EXPLORER */}
      <div className="space-y-6">
        <div className="flex flex-wrap gap-3">
            <button onClick={() => setActiveFilter(null)} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${!activeFilter ? 'bg-[#2c4305] text-white shadow-lg' : 'bg-white border-2 border-slate-100 text-slate-400'}`}>All View</button>
            {allCategories.filter(c => c.level === 'main').map(main => (
                <div key={main.id} className="flex items-center bg-white rounded-2xl border-2 border-slate-100 p-1">
                  <button onClick={() => setActiveFilter(main.id)} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${activeFilter === main.id ? 'bg-[#2c4305] text-white shadow-md' : 'text-slate-400'}`}>{main.name}</button>
                  <button onClick={() => {setShowEditModal({id: main.id, name: main.name, level: 'main', parent_id: ''}); setEditName(main.name)}} className="p-2 text-slate-300 hover:text-[#2c4305]"><MdEdit size={16}/></button>
                  <button onClick={() => setShowDeleteModal({id: main.id, name: main.name})} className="p-2 text-slate-300 hover:text-red-500"><MdDelete size={16}/></button>
                </div>
            ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allCategories.filter(c => c.level === 'sub' && (!activeFilter || c.parent_id === activeFilter)).map(sub => (
                    <div key={sub.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative group hover:border-[#2c4305]/20 transition-all">
                        <div className="flex justify-between items-center mb-6">
                          <h4 className="text-sm font-black text-slate-800 uppercase flex items-center gap-2"><MdFolder className="text-[#2c4305]"/> {sub.name}</h4>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => {setShowEditModal({id: sub.id, name: sub.name, level: 'sub', parent_id: sub.parent_id}); setEditName(sub.name)}} className="p-1.5 text-slate-300 hover:text-[#2c4305]"><MdEdit size={18}/></button>
                            <button onClick={() => setShowDeleteModal({id: sub.id, name: sub.name})} className="p-1.5 text-slate-300 hover:text-red-500"><MdDelete size={18}/></button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-50">
                            {allCategories.filter(inner => inner.parent_id === sub.id).map(inner => (
                                <div key={inner.id} className="bg-slate-50 text-slate-600 text-[9px] font-black uppercase px-3 py-2 rounded-xl flex items-center gap-2 border border-slate-100 group/inner">
                                    <span>{inner.name}</span>
                                    <div className="flex gap-1 opacity-0 group-hover/inner:opacity-100 transition-all border-l pl-2 border-slate-200">
                                      <button onClick={() => {setShowEditModal({id: inner.id, name: inner.name, level: 'inner', parent_id: inner.parent_id}); setEditName(inner.name)}} className="hover:text-[#2c4305]"><MdEdit size={14}/></button>
                                      <button onClick={() => setShowDeleteModal({id: inner.id, name: inner.name})} className="text-slate-300 hover:text-red-500"><MdClose size={14} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
        </div>
      </div>
    </div>
  );
}