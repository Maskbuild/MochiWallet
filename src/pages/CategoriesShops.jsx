import React, { useState, useRef } from 'react';
import { Trash2, Edit3, Image as ImageIcon, Sparkles } from 'lucide-react';
import {
  CUTE_EMOJIS,
  CartoonEmojiBadge,
} from '../components/CuteStickers.jsx';
import CuteSelect from '../components/CuteSelect.jsx';
import CuteColorPicker from '../components/CuteColorPicker.jsx';
import CuteNoteEditor, { FormattedNote } from '../components/CuteNoteEditor.jsx';
import CuteModal from '../components/CuteModal.jsx';
import { useI18n } from '../i18n.jsx';

export default function CategoriesShops({
  categories,
  categoryImages,
  shops,
  onRefresh,
}) {
  const { lang } = useI18n();
  const isEn = lang === 'en';

  const [activeTab, setActiveTab] = useState('categories');

  // Create Category Form States
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState('expense');
  const [parentId, setParentId] = useState('');
  const [catColor, setCatColor] = useState('#FFE0C8');
  const [catEmoji, setCatEmoji] = useState('🍱');
  const [catFile, setCatFile] = useState(null);
  const [reusedImagePath, setReusedImagePath] = useState('');
  const catFileRef = useRef(null);

  // Edit Category Pop-up Modal States
  const [editModalCat, setEditModalCat] = useState(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatType, setEditCatType] = useState('expense');
  const [editParentId, setEditParentId] = useState('');
  const [editCatColor, setEditCatColor] = useState('#FFE0C8');
  const [editCatEmoji, setEditCatEmoji] = useState('🍱');
  const [editCatFile, setEditCatFile] = useState(null);
  const [editReusedPath, setEditReusedPath] = useState('');
  const [editClearImg, setEditClearImg] = useState(false);

  // Create Shop Form States
  const [shopName, setShopName] = useState('');
  const [shopEmoji, setShopEmoji] = useState('🏪');
  const [shopColor, setShopColor] = useState('#D6ECFF');
  const [shopImageFile, setShopImageFile] = useState(null);
  const [shopImagePreview, setShopImagePreview] = useState(null);
  const [shopDefaultCat, setShopDefaultCat] = useState('');
  const [shopNote, setShopNote] = useState('');
  const shopFileInputRef = useRef(null);

  // Edit Shop Pop-up Modal States
  const [editModalShop, setEditModalShop] = useState(null);
  const [editShopName, setEditShopName] = useState('');
  const [editShopEmoji, setEditShopEmoji] = useState('🏪');
  const [editShopColor, setEditShopColor] = useState('#D6ECFF');
  const [editShopImageFile, setEditShopImageFile] = useState(null);
  const [editShopImagePreview, setEditShopImagePreview] = useState(null);
  const [editShopClearImg, setEditShopClearImg] = useState(false);
  const [editShopDefaultCat, setEditShopDefaultCat] = useState('');
  const [editShopNote, setEditShopNote] = useState('');

  function resetCatForm() {
    setCatName('');
    setCatType('expense');
    setParentId('');
    setCatColor('#FFE0C8');
    setCatEmoji('🍱');
    setCatFile(null);
    setReusedImagePath('');
    if (catFileRef.current) catFileRef.current.value = '';
  }

  function openEditCatModal(cat) {
    setEditModalCat(cat);
    setEditCatName(cat.name);
    setEditCatType(cat.type || 'expense');
    setEditParentId(cat.parent_id ? String(cat.parent_id) : '');
    setEditCatColor(cat.color || '#FFE0C8');
    setEditCatEmoji(cat.icon_emoji || '🍱');
    setEditCatFile(null);
    setEditReusedPath(cat.image_path || '');
    setEditClearImg(false);
  }

  async function handleCatSubmit(e) {
    e.preventDefault();
    if (!catName.trim()) return;

    const formData = new FormData();
    formData.append('name', catName.trim());
    formData.append('type', catType);
    formData.append('parent_id', parentId || '');
    formData.append('color', catColor);
    formData.append('icon_emoji', catEmoji);
    if (catFile) {
      formData.append('image', catFile);
    } else if (reusedImagePath) {
      formData.append('reused_image_path', reusedImagePath);
    }

    const res = await fetch('/api/categories', { method: 'POST', body: formData });
    if (res.ok) {
      resetCatForm();
      await onRefresh();
    }
  }

  async function handleEditCatSubmit(e) {
    e.preventDefault();
    if (!editModalCat || !editCatName.trim()) return;

    const formData = new FormData();
    formData.append('name', editCatName.trim());
    formData.append('type', editCatType);
    formData.append('parent_id', editParentId || '');
    formData.append('color', editCatColor);
    formData.append('icon_emoji', editCatEmoji);
    if (editCatFile) {
      formData.append('image', editCatFile);
    } else if (editReusedPath) {
      formData.append('reused_image_path', editReusedPath);
    }
    if (editClearImg) {
      formData.append('clear_image', 'true');
    }

    const res = await fetch(`/api/categories/${editModalCat.id}`, {
      method: 'PUT',
      body: formData,
    });
    if (res.ok) {
      setEditModalCat(null);
      await onRefresh();
    }
  }

  async function handleDeleteCat(id) {
    await fetch(`/api/categories/${id}`, { method: 'DELETE' });
    if (editModalCat?.id === id) setEditModalCat(null);
    await onRefresh();
  }

  async function handleDeleteGalleryImage(id) {
    await fetch(`/api/category-images/${id}`, { method: 'DELETE' });
    await onRefresh();
  }

  function resetShopForm() {
    setShopName('');
    setShopEmoji('🏪');
    setShopColor('#D6ECFF');
    setShopImageFile(null);
    setShopImagePreview(null);
    setShopDefaultCat('');
    setShopNote('');
    if (shopFileInputRef.current) shopFileInputRef.current.value = '';
  }

  function openEditShopModal(s) {
    setEditModalShop(s);
    setEditShopName(s.name);
    setEditShopEmoji(s.icon_emoji || '🏪');
    setEditShopColor(s.color || '#D6ECFF');
    setEditShopImageFile(null);
    setEditShopImagePreview(s.image_path || null);
    setEditShopClearImg(false);
    setEditShopDefaultCat(s.default_category_id ? String(s.default_category_id) : '');
    setEditShopNote(s.note || '');
  }

  async function handleShopSubmit(e) {
    e.preventDefault();
    if (!shopName.trim()) return;

    const formData = new FormData();
    formData.append('name', shopName.trim());
    formData.append('icon_emoji', shopEmoji);
    formData.append('color', shopColor);
    formData.append('default_category_id', shopDefaultCat || '');
    formData.append('note', shopNote);
    if (shopImageFile) {
      formData.append('image', shopImageFile);
    }

    const res = await fetch('/api/shops', {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      resetShopForm();
      await onRefresh();
    }
  }

  async function handleEditShopSubmit(e) {
    e.preventDefault();
    if (!editModalShop || !editShopName.trim()) return;

    const formData = new FormData();
    formData.append('name', editShopName.trim());
    formData.append('icon_emoji', editShopEmoji);
    formData.append('color', editShopColor);
    formData.append('default_category_id', editShopDefaultCat || '');
    formData.append('note', editShopNote);
    formData.append('clear_image', editShopClearImg ? 'true' : 'false');
    if (editShopImageFile) {
      formData.append('image', editShopImageFile);
    }

    const res = await fetch(`/api/shops/${editModalShop.id}`, {
      method: 'PUT',
      body: formData,
    });

    if (res.ok) {
      setEditModalShop(null);
      await onRefresh();
    }
  }

  async function handleDeleteShop(id) {
    await fetch(`/api/shops/${id}`, { method: 'DELETE' });
    if (editModalShop?.id === id) setEditModalShop(null);
    await onRefresh();
  }

  const mainCategories = categories.filter((c) => !c.parent_id && c.type === catType);
  const parentCatOptions = [
    { value: '', label: isEn ? '-- Set as Main Category --' : '-- ตั้งเป็นหมวดหมู่หลัก --' },
    ...mainCategories.map((m) => ({
      value: m.id,
      label: `${m.icon_emoji} ${m.name}`,
    })),
  ];

  const shopCatOptions = [
    { value: '', label: isEn ? '-- No Default Category --' : '-- ไม่ผูกหมวดหมู่เริ่มต้น --' },
    ...categories.map((c) => ({
      value: c.id,
      label: `${c.icon_emoji} ${c.name}`,
    })),
  ];

  return (
    <div className="space-y-6">
      <div className="bg-cream-50 border-2 border-white rounded-3xl p-5 shadow-cozy flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <CartoonEmojiBadge emoji="🏷️" color="#FFE0C8" size="lg" />
          <div>
            <h1 className="font-cute font-bold text-2xl text-pastel-cocoa">
              {isEn
                ? 'Categories (with Reusable Image Gallery) & Shops'
                : 'จัดการหมวดหมู่ (พร้อมคลังจำรูปใช้ซ้ำ) & ระบบร้านค้า'}
            </h1>
          </div>
        </div>

        <div className="flex gap-2 bg-cream-100 p-1.5 rounded-2xl border border-cream-200">
          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2 rounded-xl font-cute font-bold text-xs sm:text-sm transition-all ${activeTab === 'categories'
                ? 'bg-pastel-pink text-pastel-cocoa shadow-sticker border border-white'
                : 'text-pastel-muted'
              }`}
          >
            🏷️ {isEn ? `Categories & Gallery (${categories.length})` : `หมวดหมู่ & คลังรูปใช้ซ้ำ (${categories.length})`}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('shops')}
            className={`px-4 py-2 rounded-xl font-cute font-bold text-xs sm:text-sm transition-all ${activeTab === 'shops'
                ? 'bg-pastel-sky text-pastel-cocoa shadow-sticker border border-white'
                : 'text-pastel-muted'
              }`}
          >
            🏪 {isEn ? `Shops (${shops.length})` : `ระบบร้านค้า (${shops.length})`}
          </button>
        </div>
      </div>

      {activeTab === 'categories' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Create Category Form */}
          <div className="lg:col-span-5 bg-cream-50 border-2 border-white rounded-3xl p-5 shadow-cozy h-fit space-y-4">
            <h2 className="font-cute font-bold text-lg text-pastel-cocoa">
              {isEn ? '✨ Create New Category' : '✨ สร้างประเภท / หมวดหมู่ใหม่'}
            </h2>

            <form onSubmit={handleCatSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-2 bg-cream-100 p-1.5 rounded-2xl border border-cream-200">
                <button
                  type="button"
                  onClick={() => {
                    setCatType('expense');
                    setParentId('');
                  }}
                  className={`py-2 rounded-xl font-cute font-bold text-xs ${catType === 'expense'
                      ? 'bg-pastel-pink text-pastel-cocoa shadow-sticker border border-white'
                      : 'text-pastel-muted'
                    }`}
                >
                  {isEn ? '🧁 Expense Category' : '🧁 หมวดรายจ่าย'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCatType('income');
                    setParentId('');
                  }}
                  className={`py-2 rounded-xl font-cute font-bold text-xs ${catType === 'income'
                      ? 'bg-pastel-mint text-pastel-cocoa shadow-sticker border border-white'
                      : 'text-pastel-muted'
                    }`}
                >
                  {isEn ? '💰 Income Category' : '💰 หมวดรายรับ'}
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-pastel-cocoa mb-1">
                  {isEn ? 'Category Name *' : 'ชื่อประเภท / หมวดหมู่ *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    isEn
                      ? 'e.g. Japanese Food, Cafe, Shopping'
                      : 'เช่น อาหารญี่ปุ่น, คาเฟ่, ช้อปปิ้ง, เงินปันผล'
                  }
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-cream-100 border border-cream-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-pastel-cocoa mb-1">
                  {isEn
                    ? 'Sub-category of (leave default for Main Category)'
                    : 'เป็นหมวดหมู่ย่อยของ (เว้นว่างได้หากเป็นหมวดหลัก)'}
                </label>
                <CuteSelect
                  value={parentId}
                  onChange={(val) => setParentId(val)}
                  options={parentCatOptions}
                />
              </div>

              <div className="bg-pastel-butter/40 border-2 border-dashed border-amber-300 rounded-2xl p-3.5 space-y-2">
                <label className="text-xs font-cute font-bold text-pastel-cocoa flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 shrink-0" />
                  <span>
                    {isEn
                      ? 'Upload Category Image (Saved to gallery)'
                      : 'อัปโหลดรูปประจำหมวดหมู่ (จำไว้ใช้ซ้ำอัตโนมัติ)'}
                  </span>
                </label>
                <input
                  ref={catFileRef}
                  type="file"
                  accept="image/*,.gif,.png,.webp,.svg"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setCatFile(f);
                      setReusedImagePath('');
                    }
                  }}
                  className="block w-full text-xs text-pastel-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-pastel-butter file:text-pastel-cocoa hover:file:bg-amber-200 cursor-pointer"
                />
                {catFile && (
                  <p className="text-[11px] text-emerald-700 font-medium truncate">
                    ✅ {catFile.name}
                  </p>
                )}

                <div className="pt-2 border-t border-amber-200/70">
                  <p className="text-[11px] font-bold text-pastel-cocoa mb-1.5 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-pink-500" />
                    <span>
                      {isEn
                        ? `Or pick from Saved Reusable Gallery (${categoryImages.length}):`
                        : `หรือเลือกจากคลังรูปภาพที่ระบบจดจำไว้ (${categoryImages.length} รูป):`}
                    </span>
                  </p>
                  {categoryImages.length === 0 ? (
                    <p className="text-[11px] text-pastel-muted">
                      {isEn
                        ? 'No saved images yet. Once you upload a category image, it will appear here for 1-click reuse!'
                        : 'ยังไม่มีรูปในคลัง เมื่ออัปโหลดรูปใส่หมวดหมู่ครั้งแรก รูปจะปรากฏที่นี่เพื่อให้กดใช้ซ้ำได้ตลอด!'}
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2 p-1">
                      {categoryImages.map((img) => {
                        const isSelected = reusedImagePath === img.file_path && !catFile;
                        return (
                          <div key={img.id} className="relative group">
                            <button
                              type="button"
                              onClick={() => {
                                setReusedImagePath(img.file_path);
                                setCatFile(null);
                                if (catFileRef.current) catFileRef.current.value = '';
                              }}
                              className={`w-14 h-14 rounded-2xl p-1 bg-white border-2 flex items-center justify-center overflow-hidden transition-transform ${isSelected
                                  ? 'border-pink-500 scale-105 shadow-md ring-2 ring-pastel-pink'
                                  : 'border-cream-300 hover:scale-105'
                                }`}
                              title={img.name}
                            >
                              <img
                                src={img.file_path}
                                alt={img.name}
                                className="w-full h-full object-contain"
                              />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteGalleryImage(img.id)}
                              className="opacity-0 group-hover:opacity-100 absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center shadow"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-pastel-cocoa mb-1.5">
                  {isEn ? '🎨 Background Color & Cartoon Emoji' : '🎨 สีพื้นหลัง & อีโมจิการ์ตูน'}
                </label>
                <CuteColorPicker value={catColor} onChange={setCatColor} />
                <div className="flex flex-wrap gap-1.5 p-2.5 mt-2 bg-cream-100 rounded-2xl border border-cream-200">
                  {CUTE_EMOJIS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setCatEmoji(em)}
                      className={`w-8 h-8 rounded-xl text-base flex items-center justify-center transition-transform ${catEmoji === em
                          ? 'bg-pastel-pink border-2 border-white shadow-sm scale-110'
                          : 'hover:bg-cream-200'
                        }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-pastel-pink hover:bg-pastel-rose text-pastel-cocoa font-cute font-bold text-sm shadow-sticker border-2 border-white"
              >
                {isEn ? '🏷️ Save Category' : '🏷️ บันทึกหมวดหมู่'}
              </button>
            </form>
          </div>

          {/* Right: Categories List */}
          <div className="lg:col-span-7 space-y-4">
            {['expense', 'income'].map((grpType) => {
              const list = categories.filter((c) => c.type === grpType);
              return (
                <div
                  key={grpType}
                  className="bg-cream-50 border-2 border-white rounded-3xl p-5 shadow-cozy"
                >
                  <h3 className="font-cute font-bold text-lg text-pastel-cocoa mb-3">
                    {grpType === 'expense'
                      ? isEn
                        ? '🧁 Expense Categories'
                        : '🧁 หมวดหมู่รายจ่าย'
                      : isEn
                        ? '💰 Income Categories'
                        : '💰 หมวดหมู่รายรับ'}{' '}
                    ({list.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {list.map((c) => (
                      <div
                        key={c.id}
                        className={`flex items-center justify-between p-3 rounded-2xl bg-cream-100/90 border border-cream-200 ${c.parent_id ? 'ml-4 border-l-4 border-l-pastel-pink' : ''
                          }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <CartoonEmojiBadge
                            emoji={c.icon_emoji}
                            color={c.color}
                            image={c.image_path}
                            size="md"
                          />
                          <div className="min-w-0">
                            <p className="font-cute font-bold text-sm text-pastel-cocoa truncate">
                              {c.parent_id ? '↳ ' : ''}
                              {c.name}
                            </p>
                            <p className="text-[11px] text-pastel-muted">
                              {c.image_path
                                ? isEn
                                  ? '🖼️ Custom Image'
                                  : '🖼️ ใช้รูปภาพที่อัปโหลด'
                                : isEn
                                  ? '✨ Cartoon Emoji'
                                  : '✨ อีโมจิการ์ตูน'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditCatModal(c)}
                            className="p-1.5 rounded-xl hover:bg-white text-pastel-cocoa"
                            title={isEn ? 'Edit in Pop-up' : 'แก้ไขหมวดหมู่ (Pop-up)'}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCat(c.id)}
                            className="p-1.5 rounded-xl hover:bg-rose-100 text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* SHOPS TAB */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-cream-50 border-2 border-white rounded-3xl p-5 shadow-cozy h-fit">
            <h2 className="font-cute font-bold text-lg text-pastel-cocoa mb-4">
              {isEn ? '🏪 Add Favorite Shop' : '🏪 เพิ่มร้านค้าประจำ'}
            </h2>

            <form onSubmit={handleShopSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-pastel-cocoa mb-1">
                  {isEn ? 'Shop / Merchant Name *' : 'ชื่อร้านค้า / ผู้ให้บริการ *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    isEn
                      ? 'e.g. 7-Eleven, Café Amazon, Shopee'
                      : 'เช่น 7-Eleven, Café Amazon, Shopee, ร้านข้าวมันไก่'
                  }
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-cream-100 border border-cream-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-pastel-cocoa mb-1">
                  {isEn
                    ? 'Default Category (Auto-selected when clicking this shop)'
                    : 'ผูกหมวดหมู่เริ่มต้น (เวลากดเลือกร้านจะเลือกหมวดหมู่นี้ให้อัตโนมัติ)'}
                </label>
                <CuteSelect
                  value={shopDefaultCat}
                  onChange={(val) => setShopDefaultCat(val)}
                  options={shopCatOptions}
                />
              </div>

              {/* Shop Logo / Photo Upload */}
              <div className="bg-pastel-sky/30 border-2 border-dashed border-pastel-sky rounded-2xl p-3.5 space-y-2">
                <label className="block text-xs font-cute font-bold text-pastel-cocoa flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 shrink-0" />
                  <span>
                    {isEn ? 'Shop Logo / Photo (Optional)' : 'รูปภาพหน้าร้าน / โลโก้ร้านค้า (ไม่บังคับ)'}
                  </span>
                </label>
                <input
                  ref={shopFileInputRef}
                  type="file"
                  accept="image/*,.gif,.png,.webp,.svg,.jpg,.jpeg"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setShopImageFile(f);
                      setShopImagePreview(URL.createObjectURL(f));
                    }
                  }}
                  className="block w-full text-xs text-pastel-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-pastel-sky file:text-pastel-cocoa hover:file:bg-pastel-blue cursor-pointer"
                />
                {shopImagePreview && (
                  <div className="mt-2 flex items-center gap-3 p-2 rounded-xl bg-white/80 border border-cream-200">
                    <img
                      src={shopImagePreview}
                      alt="Shop Preview"
                      className="w-12 h-12 object-contain rounded-lg border border-white bg-cream-50"
                    />
                    <div className="text-xs flex-1 truncate">
                      <p className="font-bold text-pastel-cocoa truncate">
                        {shopImageFile?.name || (isEn ? 'Current Photo' : 'รูปที่เลือก')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShopImageFile(null);
                        setShopImagePreview(null);
                        if (shopFileInputRef.current) shopFileInputRef.current.value = '';
                      }}
                      className="px-2 py-1 rounded-lg bg-rose-100 text-rose-700 text-[11px] font-bold hover:bg-rose-200"
                    >
                      {isEn ? 'Remove' : 'ลบรูป'}
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-pastel-cocoa mb-1.5">
                  {isEn ? '🎨 Shop Badge Color & Cartoon Icon' : '🎨 สีป้ายร้านค้า & ไอคอนการ์ตูน'}
                </label>
                <CuteColorPicker value={shopColor} onChange={setShopColor} />
                <div className="flex flex-wrap gap-1.5 p-2.5 mt-2 bg-cream-100 rounded-2xl border border-cream-200">
                  {CUTE_EMOJIS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setShopEmoji(em)}
                      className={`w-8 h-8 rounded-xl text-base flex items-center justify-center transition-transform ${shopEmoji === em
                          ? 'bg-pastel-sky border-2 border-white shadow-sm scale-110'
                          : 'hover:bg-cream-200'
                        }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-pastel-cocoa mb-1">
                  {isEn ? 'Shop Note (Supports • bullets)' : 'หมายเหตุร้านค้า (รองรับ • หัวข้อย่อย)'}
                </label>
                <CuteNoteEditor value={shopNote} onChange={setShopNote} rows={2} />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-pastel-sky hover:bg-pastel-blue text-pastel-cocoa font-cute font-bold text-sm shadow-sticker border-2 border-white"
              >
                {isEn ? '🏪 Add Shop' : '🏪 เพิ่มร้านค้า'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 bg-cream-50 border-2 border-white rounded-3xl p-5 shadow-cozy h-fit">
            <h3 className="font-cute font-bold text-lg text-pastel-cocoa mb-3">
              🏪 {isEn ? `All Saved Shops (${shops.length})` : `รายชื่อร้านค้าทั้งหมด (${shops.length})`}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {shops.map((s) => (
                <div
                  key={s.id}
                  style={{ backgroundColor: s.color || '#D6ECFF' }}
                  className="rounded-3xl p-4 border-2 border-white shadow-sticker flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-white/75 border border-white flex items-center justify-center text-2xl shrink-0 overflow-hidden">
                      {s.image_path ? (
                        <img
                          src={s.image_path}
                          alt={s.name}
                          className="w-full h-full object-contain p-1"
                        />
                      ) : (
                        s.icon_emoji
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-cute font-bold text-base text-pastel-cocoa truncate">
                        {s.name}
                      </h4>
                      <p className="text-xs text-pastel-cocoa/80 truncate">
                        {s.category_name
                          ? `${isEn ? 'Default:' : 'หมวดเริ่มต้น:'} ${s.category_emoji} ${s.category_name}`
                          : isEn
                            ? 'No default category'
                            : 'ไม่ได้ระบุหมวดเริ่มต้น'}
                      </p>
                      <FormattedNote text={s.note} className="mt-1 text-pastel-cocoa/80" />
                    </div>
                  </div>

                  <div className="flex items-center gap-1 bg-white/70 p-1 rounded-2xl shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditShopModal(s)}
                      className="p-1.5 rounded-xl hover:bg-white text-pastel-cocoa"
                      title={isEn ? 'Edit in Pop-up' : 'แก้ไขร้านค้า (Pop-up)'}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteShop(s.id)}
                      className="p-1.5 rounded-xl hover:bg-rose-100 text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pop-up Modal: Edit Category */}
      <CuteModal
        open={Boolean(editModalCat)}
        title={isEn ? `Edit Category: ${editModalCat?.name}` : `แก้ไขหมวดหมู่: ${editModalCat?.name}`}
        emoji="🏷️"
        onClose={() => setEditModalCat(null)}
      >
        <form onSubmit={handleEditCatSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-pastel-cocoa mb-1">
              {isEn ? 'Category Name *' : 'ชื่อหมวดหมู่ *'}
            </label>
            <input
              type="text"
              required
              value={editCatName}
              onChange={(e) => setEditCatName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-cream-100 border border-cream-300 text-sm"
            />
          </div>

          <div className="bg-pastel-butter/40 border border-amber-300 rounded-2xl p-3 space-y-2">
            <label className="block text-xs font-cute font-bold text-pastel-cocoa">
              🖼️ {isEn ? 'Update or Reuse Category Image' : 'อัปเดตหรือเลือกรูปหมวดหมู่'}
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setEditCatFile(f);
                  setEditReusedPath('');
                  setEditClearImg(false);
                }
              }}
              className="block w-full text-xs"
            />
            {editCatFile && (
              <p className="text-[11px] text-emerald-700 font-medium truncate">
                ✅ {editCatFile.name}
              </p>
            )}
            {categoryImages.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {categoryImages.map((img) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => {
                      setEditReusedPath(img.file_path);
                      setEditCatFile(null);
                      setEditClearImg(false);
                    }}
                    className={`w-12 h-12 rounded-xl p-1 bg-white border-2 ${editReusedPath === img.file_path && !editCatFile
                        ? 'border-pink-500 scale-105'
                        : 'border-cream-300'
                      }`}
                  >
                    <img src={img.file_path} alt={img.name} className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-pastel-cocoa mb-1.5">
              🎨 {isEn ? 'Color & Emoji' : 'สี & อีโมจิการ์ตูน'}
            </label>
            <CuteColorPicker value={editCatColor} onChange={setEditCatColor} />
            <div className="flex flex-wrap gap-1.5 p-2 mt-2 bg-cream-100 rounded-2xl border border-cream-200">
              {CUTE_EMOJIS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setEditCatEmoji(em)}
                  className={`w-8 h-8 rounded-xl text-base ${editCatEmoji === em ? 'bg-pastel-pink border border-white scale-110' : ''
                    }`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-2xl bg-pastel-pink hover:bg-pastel-rose text-pastel-cocoa font-cute font-bold text-sm shadow-sticker border-2 border-white"
          >
            {isEn ? '💾 Save Category Changes' : '💾 บันทึกการแก้ไขหมวดหมู่'}
          </button>
        </form>
      </CuteModal>

      {/* Pop-up Modal: Edit Shop */}
      <CuteModal
        open={Boolean(editModalShop)}
        title={isEn ? `Edit Shop: ${editModalShop?.name}` : `แก้ไขร้านค้า: ${editModalShop?.name}`}
        emoji="🏪"
        onClose={() => setEditModalShop(null)}
      >
        <form onSubmit={handleEditShopSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-pastel-cocoa mb-1">
              {isEn ? 'Shop Name *' : 'ชื่อร้านค้า *'}
            </label>
            <input
              type="text"
              required
              value={editShopName}
              onChange={(e) => setEditShopName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-cream-100 border border-cream-300 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-pastel-cocoa mb-1">
              {isEn ? 'Default Category' : 'หมวดหมู่เริ่มต้น'}
            </label>
            <CuteSelect
              value={editShopDefaultCat}
              onChange={setEditShopDefaultCat}
              options={shopCatOptions}
            />
          </div>

          <div className="bg-pastel-sky/30 border border-pastel-sky rounded-2xl p-3 space-y-2">
            <label className="block text-xs font-cute font-bold text-pastel-cocoa">
              🖼️ {isEn ? 'Update Shop Photo / Logo' : 'อัปเดตรูปหน้าร้าน / โลโก้ร้านค้า'}
            </label>
            <input
              type="file"
              accept="image/*,.gif,.png,.webp,.svg,.jpg,.jpeg"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setEditShopImageFile(f);
                  setEditShopImagePreview(URL.createObjectURL(f));
                  setEditShopClearImg(false);
                }
              }}
              className="block w-full text-xs"
            />
            {editShopImagePreview && (
              <div className="flex items-center gap-3 p-2 rounded-xl bg-white/80 border border-cream-200">
                <img
                  src={editShopImagePreview}
                  alt="Shop Preview"
                  className="w-10 h-10 object-contain rounded-lg border border-white bg-cream-50"
                />
                <button
                  type="button"
                  onClick={() => {
                    setEditShopImageFile(null);
                    setEditShopImagePreview(null);
                    setEditShopClearImg(true);
                  }}
                  className="px-2 py-1 rounded-lg bg-rose-100 text-rose-700 text-[11px] font-bold hover:bg-rose-200"
                >
                  {isEn ? 'Remove' : 'ลบรูป'}
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-pastel-cocoa mb-1.5">
              🎨 {isEn ? 'Color & Icon' : 'สีป้ายร้านค้า & ไอคอน'}
            </label>
            <CuteColorPicker value={editShopColor} onChange={setEditShopColor} />
            <div className="flex flex-wrap gap-1.5 p-2 mt-2 bg-cream-100 rounded-2xl border border-cream-200">
              {CUTE_EMOJIS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setEditShopEmoji(em)}
                  className={`w-8 h-8 rounded-xl text-base ${editShopEmoji === em ? 'bg-pastel-sky border border-white scale-110' : ''
                    }`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-pastel-cocoa mb-1">
              {isEn ? 'Shop Note' : 'หมายเหตุร้านค้า'}
            </label>
            <CuteNoteEditor value={editShopNote} onChange={setEditShopNote} rows={2} />
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-2xl bg-pastel-sky hover:bg-pastel-blue text-pastel-cocoa font-cute font-bold text-sm shadow-sticker border-2 border-white"
          >
            {isEn ? '💾 Save Shop Changes' : '💾 บันทึกการแก้ไขร้านค้า'}
          </button>
        </form>
      </CuteModal>
    </div>
  );
}
