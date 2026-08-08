import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { DynamicSection, DynamicFieldDefinition, DynamicFieldType } from '../types';
import { 
  SlidersHorizontal, 
  Plus, 
  Trash2, 
  Edit3, 
  Sparkles, 
  Check, 
  Layers, 
  Calendar, 
  FileText, 
  ListPlus,
  ShieldAlert
} from 'lucide-react';

export const DynamicInfoBuilderView: React.FC = () => {
  const { dynamicSections, addDynamicSection, updateDynamicSection, deleteDynamicSection, addAuditLog } = useData();
  const { isSuperAdmin, currentUser } = useAuth();

  const [activeSectionId, setActiveSectionId] = useState<string>(dynamicSections[0]?.id || '');
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [editingSection, setEditingSection] = useState<DynamicSection | null>(null);

  // New section form state
  const [sectionTitle, setSectionTitle] = useState('');
  const [sectionDesc, setSectionDesc] = useState('');
  const [isRepeatable, setIsRepeatable] = useState(false);
  const [industryTemplate, setIndustryTemplate] = useState('General');

  // Fields state for editing
  const [fields, setFields] = useState<DynamicFieldDefinition[]>([]);

  // Field creation modal
  const [showFieldModal, setShowFieldModal] = useState(false);
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldType, setFieldType] = useState<DynamicFieldType>('Text');
  const [fieldPlaceholder, setFieldPlaceholder] = useState('');
  const [fieldOptions, setFieldOptions] = useState('');
  const [isRequired, setIsRequired] = useState(false);
  const [includeDeadline, setIncludeDeadline] = useState(false);

  const activeSection = dynamicSections.find(s => s.id === activeSectionId) || dynamicSections[0];

  const handleOpenNewSectionModal = () => {
    setEditingSection(null);
    setSectionTitle('');
    setSectionDesc('');
    setIsRepeatable(false);
    setIndustryTemplate('General');
    setFields([]);
    setShowSectionModal(true);
  };

  const handleSaveSection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionTitle.trim()) return;

    if (editingSection) {
      updateDynamicSection(editingSection.id, {
        ...editingSection,
        title: sectionTitle,
        description: sectionDesc,
        isRepeatable,
        industryTemplate,
        fields,
      });
      addAuditLog('Dynamic Section Updated', `Updated section ${sectionTitle}`, currentUser?.id || '', currentUser?.fullName || '');
    } else {
      const created = addDynamicSection({
        title: sectionTitle,
        description: sectionDesc,
        isRepeatable,
        industryTemplate,
        fields,
      });
      setActiveSectionId(created.id);
      addAuditLog('Dynamic Section Created', `Created custom client section ${sectionTitle}`, currentUser?.id || '', currentUser?.fullName || '');
    }

    setShowSectionModal(false);
  };

  const handleAddFieldToForm = () => {
    if (!fieldLabel.trim()) return;

    const newField: DynamicFieldDefinition = {
      id: `f_${Date.now()}`,
      label: fieldLabel,
      type: fieldType,
      placeholder: fieldPlaceholder,
      options: ['Dropdown', 'Radio', 'Checkbox'].includes(fieldType) 
        ? fieldOptions.split(',').map(s => s.trim()).filter(Boolean)
        : undefined,
      validation: {
        required: isRequired
      },
      includeDeadline,
    };

    if (editingSection) {
      const updatedFields = [...editingSection.fields, newField];
      updateDynamicSection(editingSection.id, {
        ...editingSection,
        fields: updatedFields,
      });
    } else {
      setFields([...fields, newField]);
    }

    setFieldLabel('');
    setFieldPlaceholder('');
    setFieldOptions('');
    setIsRequired(false);
    setIncludeDeadline(false);
    setShowFieldModal(false);
  };

  const handleDeleteFieldFromSection = (sectionId: string, fieldId: string) => {
    const targetSec = dynamicSections.find(s => s.id === sectionId);
    if (!targetSec) return;
    const updatedFields = targetSec.fields.filter(f => f.id !== fieldId);
    updateDynamicSection(sectionId, {
      ...targetSec,
      fields: updatedFields,
    });
  };

  const applyPresetTemplate = (templateName: string) => {
    let preset: Omit<DynamicSection, 'id' | 'createdAt'>;
    if (templateName === 'Construction') {
      preset = {
        title: 'Construction & PCAB Accreditation',
        description: 'Philippine Contractors Accreditation Board license, project list, and safety permits.',
        isRepeatable: false,
        industryTemplate: 'Construction',
        fields: [
          { id: 'f_pcab_no', label: 'PCAB License Number', type: 'Text', validation: { required: true } },
          { id: 'f_pcab_category', label: 'License Category', type: 'Dropdown', options: ['AAA', 'AA', 'A', 'B', 'C', 'D'] },
          { id: 'f_pcab_exp', label: 'License Expiration Date', type: 'Date', includeDeadline: true, validation: { required: true } },
          { id: 'f_safety_officer', label: 'Certified Safety Officer Name', type: 'Text' }
        ]
      };
    } else if (templateName === 'Real Estate') {
      preset = {
        title: 'Real Estate Developer & DHSUD Registration',
        description: 'Department of Human Settlements and Urban Development licenses and development projects.',
        isRepeatable: true,
        industryTemplate: 'Real Estate',
        fields: [
          { id: 'f_dhsud_no', label: 'DHSUD Registration No.', type: 'Text', validation: { required: true } },
          { id: 'f_project_name', label: 'Subdivision/Condo Project Name', type: 'Text' },
          { id: 'f_license_to_sell', label: 'License to Sell (LTS) Number', type: 'Text' }
        ]
      };
    } else {
      preset = {
        title: 'Government Registrations & Approvals',
        description: 'Custom government agency permits, SSS/PhilHealth/Pag-IBIG employer certificates.',
        isRepeatable: true,
        industryTemplate: 'General',
        fields: [
          { id: 'f_agency', label: 'Government Agency', type: 'Text', placeholder: 'e.g. PEZA, BOI, FDA' },
          { id: 'f_cert_no', label: 'Certificate / Permit No.', type: 'Text' },
          { id: 'f_issue_date', label: 'Issue Date', type: 'Date' }
        ]
      };
    }

    addDynamicSection(preset);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-indigo-600" />
            Dynamic Client Information Builder ⭐
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Build custom profile sections, repeatable records, dynamic field validations, and industry templates without writing code.
          </p>
        </div>

        {isSuperAdmin && (
          <button
            onClick={handleOpenNewSectionModal}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-2xs text-xs flex items-center gap-2 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" /> Create Custom Section
          </button>
        )}
      </div>

      {/* Industry Preset Templates Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2">
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Quick Add Industry Section Templates
        </p>
        <div className="flex flex-wrap gap-2">
          {['Construction', 'Real Estate', 'General Government'].map(tpl => (
            <button
              key={tpl}
              onClick={() => applyPresetTemplate(tpl)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <ListPlus className="w-3.5 h-3.5 text-indigo-600" /> Add {tpl} Template
            </button>
          ))}
        </div>
      </div>

      {/* Main Builder Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Column: List of Custom Sections */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">Configured Profile Sections</p>

          {dynamicSections.map(sec => {
            const isActive = sec.id === activeSectionId;
            return (
              <div
                key={sec.id}
                onClick={() => setActiveSectionId(sec.id)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  isActive 
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-950 shadow-2xs' 
                    : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-xs">{sec.title}</h4>
                  {sec.isRepeatable && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                      Repeatable
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{sec.description}</p>
                <div className="mt-2 text-[10px] text-slate-400 font-medium flex items-center gap-2">
                  <span>{sec.fields.length} Custom Fields</span>
                  <span>•</span>
                  <span>{sec.industryTemplate}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Active Section Preview & Field Configurator */}
        {activeSection && (
          <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            
            {/* Section Header */}
            <div className="flex justify-between items-start pb-4 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">{activeSection.title}</h3>
                  {activeSection.isRepeatable && (
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                      Supports Repeatable Records
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">{activeSection.description}</p>
              </div>

              {isSuperAdmin && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingSection(activeSection);
                      setSectionTitle(activeSection.title);
                      setSectionDesc(activeSection.description || '');
                      setIsRepeatable(activeSection.isRepeatable || false);
                      setIndustryTemplate(activeSection.industryTemplate || 'General');
                      setFields(activeSection.fields);
                      setShowSectionModal(true);
                    }}
                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete section ${activeSection.title}?`)) {
                        deleteDynamicSection(activeSection.id);
                      }
                    }}
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* List of Fields in Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-slate-500 text-xs uppercase tracking-wider">
                  Configured Form Fields
                </h4>
                {isSuperAdmin && (
                  <button
                    onClick={() => setShowFieldModal(true)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Field
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeSection.fields.map(field => (
                  <div key={field.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl relative group">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-slate-900 text-xs">{field.label}</span>
                        {field.validation?.required && <span className="text-rose-600 ml-1 font-bold">*</span>}
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-200 text-slate-700">
                        {field.type}
                      </span>
                    </div>

                    {field.placeholder && (
                      <p className="text-[11px] text-slate-500 mt-1 italic">Placeholder: "{field.placeholder}"</p>
                    )}

                    {field.options && (
                      <p className="text-[10px] text-indigo-700 font-semibold mt-1">Options: {field.options.join(', ')}</p>
                    )}

                    {field.includeDeadline && (
                      <span className="inline-block mt-2 px-2 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 uppercase">
                        Includes Compliance Deadline Monitor
                      </span>
                    )}

                    {isSuperAdmin && (
                      <button
                        onClick={() => handleDeleteFieldFromSection(activeSection.id, field.id)}
                        className="absolute top-2 right-2 p-1 text-rose-600 hover:bg-rose-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Modal for Creating / Editing Section */}
      {showSectionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full space-y-4 text-xs shadow-xl text-slate-800">
            <h3 className="font-bold text-slate-900 text-base">
              {editingSection ? 'Edit Section Configuration' : 'Create Dynamic Client Section'}
            </h3>

            <div>
              <label className="block text-slate-600 mb-1 font-semibold">Section Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Bank Accounts, Vehicles, Shareholders"
                value={sectionTitle}
                onChange={e => setSectionTitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="block text-slate-600 mb-1 font-semibold">Description / Instructions</label>
              <textarea
                rows={2}
                placeholder="Brief guidelines for staff when filling this section..."
                value={sectionDesc}
                onChange={e => setSectionDesc(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="flex items-center gap-3 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-800 font-semibold">
                <input
                  type="checkbox"
                  checked={isRepeatable}
                  onChange={e => setIsRepeatable(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Support Repeatable Records (e.g. Multiple bank accounts, vehicles)</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowSectionModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSection}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-2xs"
              >
                Save Section
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Adding Field */}
      {showFieldModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full space-y-4 text-xs shadow-xl text-slate-800">
            <h3 className="font-bold text-slate-900 text-sm">Add New Field to Section</h3>

            <div>
              <label className="block text-slate-600 mb-1 font-semibold">Field Label *</label>
              <input
                type="text"
                required
                placeholder="e.g. Account Number, Expiration Date"
                value={fieldLabel}
                onChange={e => setFieldLabel(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="block text-slate-600 mb-1 font-semibold">Field Type</label>
              <select
                value={fieldType}
                onChange={e => setFieldType(e.target.value as any)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-100"
              >
                <option value="Text">Text</option>
                <option value="Paragraph">Paragraph</option>
                <option value="Number">Number</option>
                <option value="Currency">Currency (₱)</option>
                <option value="Date">Date</option>
                <option value="Dropdown">Dropdown</option>
                <option value="Checkbox">Checkbox</option>
                <option value="Radio">Radio Button</option>
                <option value="FileUpload">File Upload</option>
                <option value="Signature">Signature</option>
              </select>
            </div>

            {['Dropdown', 'Radio', 'Checkbox'].includes(fieldType) && (
              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Comma-separated Options</label>
                <input
                  type="text"
                  placeholder="Option 1, Option 2, Option 3"
                  value={fieldOptions}
                  onChange={e => setFieldOptions(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </div>
            )}

            <div>
              <label className="block text-slate-600 mb-1 font-semibold">Placeholder Text</label>
              <input
                type="text"
                placeholder="Hint for user input..."
                value={fieldPlaceholder}
                onChange={e => setFieldPlaceholder(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-800 font-semibold">
                <input
                  type="checkbox"
                  checked={isRequired}
                  onChange={e => setIsRequired(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Required Field</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-800 font-semibold">
                <input
                  type="checkbox"
                  checked={includeDeadline}
                  onChange={e => setIncludeDeadline(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Include Compliance Deadline Monitoring</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowFieldModal(false)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddFieldToForm}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-2xs"
              >
                Add Field
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
