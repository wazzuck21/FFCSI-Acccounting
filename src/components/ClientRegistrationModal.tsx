import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { ClientProfile, EntityType, CustomDeadlineRule } from '../types';
import { extractBaseTin, formatFullTin } from '../utils/tinBranchUtils';
import { CurrencyInput } from './CurrencyInput';
import { X, Plus, Search, Check, ShieldAlert, Sparkles, Building2, GitFork, Link, MapPin, AlertCircle, UserCheck } from 'lucide-react';
import { 
  getProvinces, 
  getCitiesByProvince, 
  getBarangaysByCity, 
  findProvinceForCity, 
  getAllCities 
} from '../data/philippineAddressData';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingClient?: ClientProfile | null;
}

export const ClientRegistrationModal: React.FC<ModalProps> = ({ isOpen, onClose, editingClient }) => {
  const { 
    clients,
    addClient, 
    updateClient, 
    masterChoices, 
    addMasterBusinessNature,
    addMasterBirOption,
    addMasterBenefitsOption,
    updateMasterBenefitsOption,
    addAuditLog
  } = useData();

  const { isSuperAdmin, currentUser, allUsers } = useAuth();

  // Address separated fields ⭐
  const [streetBuilding, setStreetBuilding] = useState('');
  const [barangay, setBarangay] = useState('');
  const [cityMunicipality, setCityMunicipality] = useState('');
  const [province, setProvince] = useState('');

  // Address Custom Input Toggles ⭐
  const [isCustomProvince, setIsCustomProvince] = useState(false);
  const [isCustomCity, setIsCustomCity] = useState(false);
  const [isCustomBarangay, setIsCustomBarangay] = useState(false);

  // Address Cascading Handlers ⭐
  const handleProvinceChange = (newProv: string) => {
    if (newProv === '__CUSTOM__') {
      setIsCustomProvince(true);
      setProvince('');
      return;
    }
    setIsCustomProvince(false);
    setProvince(newProv);

    // If city is set but doesn't belong to new province, reset city & barangay
    if (cityMunicipality && !isCustomCity) {
      const validCities = getCitiesByProvince(newProv);
      if (!validCities.includes(cityMunicipality)) {
        setCityMunicipality('');
        setBarangay('');
      }
    }
  };

  const handleCityChange = (newCity: string) => {
    if (newCity === '__CUSTOM__') {
      setIsCustomCity(true);
      setCityMunicipality('');
      return;
    }
    setIsCustomCity(false);
    setCityMunicipality(newCity);

    // Vice-Versa Cascade: Automatically detect and set Province if known!
    const detectedProv = findProvinceForCity(newCity);
    if (detectedProv) {
      setProvince(detectedProv);
      setIsCustomProvince(false);
    }

    // Reset barangay if current barangay is invalid for new city
    if (barangay && !isCustomBarangay) {
      const validBarangays = getBarangaysByCity(newCity);
      if (!validBarangays.includes(barangay)) {
        setBarangay('');
      }
    }
  };

  const handleBarangayChange = (newBrgy: string) => {
    if (newBrgy === '__CUSTOM__') {
      setIsCustomBarangay(true);
      setBarangay('');
      return;
    }
    setIsCustomBarangay(false);
    setBarangay(newBrgy);
  };

  // Available options for address dropdowns
  const availableProvinces = getProvinces();
  const availableCities = province
    ? getCitiesByProvince(province)
    : getAllCities().map(c => c.cityName);
  const availableBarangays = cityMunicipality
    ? getBarangaysByCity(cityMunicipality)
    : [];

  // Form states
  const [companyName, setCompanyName] = useState('');
  const [tinNumber, setTinNumber] = useState('');
  const [address, setAddress] = useState('');
  const [rdoNumber, setRdoNumber] = useState('');
  const [accountingPeriod, setAccountingPeriod] = useState<'Calendar' | 'Fiscal' | ''>('');
  const [fiscalYearEndMonth, setFiscalYearEndMonth] = useState('June');
  const [fiscalYearEndDay, setFiscalYearEndDay] = useState('30');

  // Parent-Child Branch Relationship ⭐
  const [isBranch, setIsBranch] = useState(false);
  const [parentClientId, setParentClientId] = useState('');
  const [branchCode, setBranchCode] = useState('000');
  
  // Registration Method & Entity
  const [registrationMethod, setRegistrationMethod] = useState<'Manual' | 'eFPS' | ''>('');
  const [entityType, setEntityType] = useState<EntityType | ''>('');

  // Conditional Corp / Partnership
  const [secRegistrationNumber, setSecRegistrationNumber] = useState('');
  const [annualMeetingDate, setAnnualMeetingDate] = useState('');

  // Conditional Proprietor
  const [dtiRegistrationNumber, setDtiRegistrationNumber] = useState('');
  const [dtiExpirationDate, setDtiExpirationDate] = useState('');
  const [proprietorFirstName, setProprietorFirstName] = useState('');
  const [proprietorLastName, setProprietorLastName] = useState('');
  const [proprietorMiddleName, setProprietorMiddleName] = useState('');

  // Business Natures Searchable Checklist
  const [selectedNatures, setSelectedNatures] = useState<string[]>([]);
  const [natureSearch, setNatureSearch] = useState('');
  const [newNatureInput, setNewNatureInput] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [psicCode, setPsicCode] = useState('');
  const [manualPsicInput, setManualPsicInput] = useState('');
  const [manualNatureDescInput, setManualNatureDescInput] = useState('');
  const [manualLineOfBusinessInput, setManualLineOfBusinessInput] = useState('');

  // Unfilled fields tracking alert ⭐
  const [unfilledFields, setUnfilledFields] = useState<string[]>([]);
  const [showUnfilledAlert, setShowUnfilledAlert] = useState(false);

  // BIR Tax Services Selected
  const [selectedBirServices, setSelectedBirServices] = useState<string[]>([]);
  
  // Custom BIR Deadline addition modal
  const [showAddBirModal, setShowAddBirModal] = useState(false);
  const [newBirCode, setNewBirCode] = useState('');
  const [newBirName, setNewBirName] = useState('');
  const [newBirDesc, setNewBirDesc] = useState('');

  // Benefits Selected
  const [selectedBenefits, setSelectedBenefits] = useState<string[]>([]);

  // User confirmation modal state when unchecking/unenrolling forms ⭐
  const [showUnenrollConfirmationModal, setShowUnenrollConfirmationModal] = useState(false);
  const [removedBirList, setRemovedBirList] = useState<string[]>([]);
  const [removedBenList, setRemovedBenList] = useState<string[]>([]);
  const [pendingClientDataToSave, setPendingClientDataToSave] = useState<any>(null);

  // Custom Benefits statutory addition modal
  const [showAddBenefitsModal, setShowAddBenefitsModal] = useState(false);
  const [newBenCode, setNewBenCode] = useState('');
  const [newBenName, setNewBenName] = useState('');
  const [newBenDesc, setNewBenDesc] = useState('');
  const [newBenIsExclusive, setNewBenIsExclusive] = useState(false);
  const [selectedParentForAddBenefit, setSelectedParentForAddBenefit] = useState<string>('HDMF (Pag-IBIG Fund)');
  const [createdExclusiveCodes, setCreatedExclusiveCodes] = useState<string[]>([]);

  // Parent-Child Hierarchy Grouping for Statutory Benefits ⭐
  const groupedBenefits = React.useMemo(() => {
    const groups: Record<string, CustomDeadlineRule[]> = {
      'HDMF (Pag-IBIG Fund)': [],
      'SSS (Social Security System)': [],
      'PhilHealth (PHIC)': [],
    };

    masterChoices.benefitsOptions.forEach(opt => {
      // Filter out options exclusive to another client
      if (opt.isExclusiveToClient) {
        const isThisSessionCreated = createdExclusiveCodes.includes(opt.code);
        const isCurrentlySelected = selectedBenefits.includes(opt.code);
        const isForThisEditingClient = Boolean(editingClient?.id && opt.exclusiveClientId === editingClient.id);

        if (!isThisSessionCreated && !isCurrentlySelected && !isForThisEditingClient) {
          return;
        }
      }

      let parent = opt.parentCategory;
      if (!parent) {
        const codeUpper = opt.code.toUpperCase();
        if (codeUpper.includes('HDMF') || codeUpper.includes('PAG-IBIG') || codeUpper.includes('PAGIBIG')) {
          parent = 'HDMF (Pag-IBIG Fund)';
        } else if (codeUpper.includes('SSS')) {
          parent = 'SSS (Social Security System)';
        } else if (codeUpper.includes('PHILHEALTH') || codeUpper.includes('PHIC')) {
          parent = 'PhilHealth (PHIC)';
        } else {
          parent = 'Other Statutory / Custom Benefits';
        }
      }

      if (!groups[parent]) {
        groups[parent] = [];
      }
      groups[parent].push(opt);
    });

    return groups;
  }, [masterChoices.benefitsOptions, editingClient?.id, createdExclusiveCodes, selectedBenefits]);

  // Interlinked BIR Tax Selection Logic (Strictly Dynamically Guided by Master Choices Form Linkages) ⭐
  const toggleBirServiceWithInterlinks = (codeToToggle: string) => {
    const isCurrentlySelected = selectedBirServices.includes(codeToToggle);
    let updated = [...selectedBirServices];

    // Helper to add or remove item safely
    const add = (items: string[]) => {
      items.forEach(item => {
        if (!updated.includes(item)) updated.push(item);
      });
    };
    const remove = (items: string[]) => {
      updated = updated.filter(s => !items.includes(s));
    };

    const upper = codeToToggle.toUpperCase();

    // Dynamically match against masterChoices.formLinkages
    const matchingLinkages = (masterChoices.formLinkages || []).filter(
      l => l.primaryCode.toUpperCase() === upper || (l.linkedCodes || []).map(c => c.toUpperCase()).includes(upper)
    );

    if (matchingLinkages.length > 0) {
      const linkedCodesSet = new Set<string>();
      matchingLinkages.forEach(l => {
        linkedCodesSet.add(l.primaryCode);
        (l.linkedCodes || []).forEach(c => linkedCodesSet.add(c));
      });

      const group = Array.from(linkedCodesSet);
      if (isCurrentlySelected) {
        remove(group);
      } else {
        add(group);
      }
      setSelectedBirServices(updated);
      return;
    }

    // Standard toggle for other custom tax rules with no linkages defined
    if (isCurrentlySelected) {
      remove([codeToToggle]);
    } else {
      add([codeToToggle]);
    }
    setSelectedBirServices(updated);
  };

  // Status & Retainers Fee
  const [status, setStatus] = useState<'Active' | 'Inactive' | 'For Compliance' | ''>('');
  const [retainersFee, setRetainersFee] = useState<number | ''>('');

  // Additional Contact Info
  const [contactPerson, setContactPerson] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [telephoneNumber, setTelephoneNumber] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [assignedStaffId, setAssignedStaffId] = useState('');
  const [assignedStaffName, setAssignedStaffName] = useState('');
  const [notes, setNotes] = useState('');

  // Smooth Non-Jumping TIN Typing Handler
  const handleTinChange = (val: string) => {
    const cleanDigits = val.replace(/\D/g, '');
    if (!isBranch) {
      const digits = cleanDigits.slice(0, 9);
      if (digits.length <= 3) setTinNumber(digits);
      else if (digits.length <= 6) setTinNumber(`${digits.slice(0, 3)}-${digits.slice(3)}`);
      else setTinNumber(`${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`);
    } else {
      const digits = cleanDigits.slice(0, 12);
      if (digits.length <= 3) setTinNumber(digits);
      else if (digits.length <= 6) setTinNumber(`${digits.slice(0, 3)}-${digits.slice(3)}`);
      else if (digits.length <= 9) setTinNumber(`${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`);
      else setTinNumber(`${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 9)}-${digits.slice(9)}`);
    }
  };

  // Populate or reset form fields whenever editingClient or modal open status changes
  useEffect(() => {
    if (editingClient) {
      setCompanyName(editingClient.companyName || '');
      
      // If head office, strip suffix if present for clean typing in base TIN box
      if (!editingClient.isBranch && editingClient.tinNumber) {
        const parts = editingClient.tinNumber.split('-');
        if (parts.length >= 3) {
          setTinNumber(`${parts[0]}-${parts[1]}-${parts[2]}`);
        } else {
          setTinNumber(editingClient.tinNumber);
        }
      } else {
        setTinNumber(editingClient.tinNumber || '');
      }

      // Parse address into separated fields
      const rawAddr = editingClient.address || '';
      setAddress(rawAddr);
      const addrParts = rawAddr.split(',').map(s => s.trim());
      let parsedStreet = '';
      let parsedBrgy = '';
      let parsedCity = '';
      let parsedProv = '';

      if (addrParts.length >= 4) {
        parsedStreet = addrParts[0];
        parsedBrgy = addrParts[1];
        parsedCity = addrParts[2];
        parsedProv = addrParts.slice(3).join(', ');
      } else if (addrParts.length === 3) {
        parsedStreet = addrParts[0];
        parsedBrgy = addrParts[1];
        parsedCity = addrParts[2];
      } else if (addrParts.length === 2) {
        parsedStreet = addrParts[0];
        parsedCity = addrParts[1];
      } else {
        parsedStreet = rawAddr;
      }

      setStreetBuilding(parsedStreet);
      setBarangay(parsedBrgy);
      setCityMunicipality(parsedCity);
      setProvince(parsedProv);

      // Reset / Detect custom mode for dropdown matching
      if (parsedProv) {
        const provMatch = getProvinces().find(p => p.toLowerCase() === parsedProv.toLowerCase());
        if (provMatch) {
          setProvince(provMatch);
          setIsCustomProvince(false);
        } else {
          setIsCustomProvince(true);
        }
      } else {
        setIsCustomProvince(false);
      }

      if (parsedCity) {
        const cityMatch = getAllCities().find(c => c.cityName.toLowerCase() === parsedCity.toLowerCase());
        if (cityMatch) {
          setCityMunicipality(cityMatch.cityName);
          setIsCustomCity(false);
          if (!parsedProv) {
            setProvince(cityMatch.provinceName);
          }
        } else {
          setIsCustomCity(true);
        }
      } else {
        setIsCustomCity(false);
      }

      if (parsedBrgy) {
        const brgyList = parsedCity ? getBarangaysByCity(parsedCity) : [];
        const brgyMatch = brgyList.find(b => b.toLowerCase() === parsedBrgy.toLowerCase());
        if (brgyMatch) {
          setBarangay(brgyMatch);
          setIsCustomBarangay(false);
        } else {
          setIsCustomBarangay(true);
        }
      } else {
        setIsCustomBarangay(false);
      }

      setZipCode(editingClient.zipCode || '');
      setPsicCode(editingClient.psicCode || '');
      setRdoNumber(editingClient.rdoNumber || '');
      setAccountingPeriod(editingClient.accountingPeriod || 'Calendar');
      setFiscalYearEndMonth(editingClient.fiscalYearEndMonth || 'June');
      setFiscalYearEndDay(editingClient.fiscalYearEndDay || '30');
      setIsBranch(editingClient.isBranch || false);
      setParentClientId(editingClient.parentClientId || '');
      setBranchCode(editingClient.branchCode || '000');
      setRegistrationMethod(editingClient.registrationMethod || 'eFPS');
      setEntityType(editingClient.entityType || 'Corporation');
      setSecRegistrationNumber(editingClient.secRegistrationNumber || '');
      setAnnualMeetingDate(editingClient.annualMeetingDate || '');
      setDtiRegistrationNumber(editingClient.dtiRegistrationNumber || '');
      setDtiExpirationDate(editingClient.dtiExpirationDate || '');
      setProprietorFirstName(editingClient.proprietorFirstName || '');
      setProprietorLastName(editingClient.proprietorLastName || '');
      setProprietorMiddleName(editingClient.proprietorMiddleName || '');
      setSelectedNatures(editingClient.businessNature || []);
      setSelectedBirServices(editingClient.birTaxServices || []);
      setSelectedBenefits(editingClient.benefitsServices || []);
      setStatus(editingClient.status || 'Active');
      setRetainersFee(editingClient.retainersFee || 25000);
      setContactPerson(editingClient.contactPerson || '');
      setMobileNumber(editingClient.mobileNumber || '');
      setTelephoneNumber(editingClient.telephoneNumber || '');
      setEmailAddress(editingClient.emailAddress || '');
      setAssignedStaffId(editingClient.assignedStaffId || '');
      setAssignedStaffName(editingClient.assignedStaffName || '');
      setNotes(editingClient.notes || '');
    } else if (isOpen) {
      // NEW REGISTRATION: Leave all fields COMPLETELY BLANK ⭐
      setCompanyName('');
      setTinNumber('');
      setAddress('');
      setStreetBuilding('');
      setBarangay('');
      setCityMunicipality('');
      setProvince('');
      setIsCustomProvince(false);
      setIsCustomCity(false);
      setIsCustomBarangay(false);
      setRdoNumber('');
      setAccountingPeriod('');
      setIsBranch(false);
      setParentClientId('');
      setBranchCode('000');
      setRegistrationMethod('');
      setEntityType('');
      setSecRegistrationNumber('');
      setAnnualMeetingDate('');
      setDtiRegistrationNumber('');
      setDtiExpirationDate('');
      setProprietorFirstName('');
      setProprietorLastName('');
      setProprietorMiddleName('');
      setSelectedNatures([]);
      setZipCode('');
      setPsicCode('');
      setManualPsicInput('');
      setManualNatureDescInput('');
      setManualLineOfBusinessInput('');
      setUnfilledFields([]);
      setShowUnfilledAlert(false);
      setSelectedBirServices([]);
      setSelectedBenefits([]);
      setStatus('');
      setRetainersFee('');
      setContactPerson('');
      setMobileNumber('');
      setTelephoneNumber('');
      setEmailAddress('');
      setAssignedStaffId('');
      setAssignedStaffName('');
      setNotes('');
      setCreatedExclusiveCodes([]);
    }
  }, [editingClient, isOpen]);

  if (!isOpen) return null;

  // Toggle business nature
  const toggleNature = (nat: string) => {
    if (selectedNatures.includes(nat)) {
      setSelectedNatures(selectedNatures.filter(n => n !== nat));
    } else {
      setSelectedNatures([...selectedNatures, nat]);
    }
  };

  const handleAddNewNature = () => {
    if (newNatureInput.trim()) {
      addMasterBusinessNature(newNatureInput.trim());
      setSelectedNatures([...selectedNatures, newNatureInput.trim()]);
      setNewNatureInput('');
    }
  };

  const handleAddCustomBirOption = () => {
    if (newBirCode.trim() && newBirName.trim()) {
      const newOption: CustomDeadlineRule = {
        id: `bir_custom_${Date.now()}`,
        code: newBirCode.trim().toUpperCase(),
        name: newBirName.trim(),
        category: 'BIR',
        frequency: 'Monthly',
        deadlineDay: 10,
        customDescription: newBirDesc.trim() || 'Custom recurring deadline',
      };
      addMasterBirOption(newOption);
      setSelectedBirServices([...selectedBirServices, newOption.code]);
      setNewBirCode('');
      setNewBirName('');
      setNewBirDesc('');
      setShowAddBirModal(false);
    }
  };

  const handleAddCustomBenefitsOption = () => {
    if (newBenCode.trim() && newBenName.trim()) {
      const code = newBenCode.trim();
      const newOption: CustomDeadlineRule = {
        id: `ben_custom_${Date.now()}`,
        code: code,
        name: newBenName.trim(),
        category: 'Benefits',
        parentCategory: selectedParentForAddBenefit || 'HDMF (Pag-IBIG Fund)',
        frequency: 'Monthly',
        deadlineDay: 15,
        customDescription: newBenDesc.trim() || `Sub-item under ${selectedParentForAddBenefit}`,
        isExclusiveToClient: newBenIsExclusive,
        exclusiveClientId: editingClient?.id,
        exclusiveClientName: companyName.trim() || editingClient?.companyName || 'This Client'
      };
      addMasterBenefitsOption(newOption);
      if (newBenIsExclusive) {
        setCreatedExclusiveCodes(prev => [...prev, code]);
      }
      setSelectedBenefits(prev => [...prev, code]);
      setNewBenCode('');
      setNewBenName('');
      setNewBenDesc('');
      setNewBenIsExclusive(false);
      setShowAddBenefitsModal(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isSuperAdmin) {
      alert('🔒 Access Denied: Only Super Admin users are authorized to register or modify client profiles.');
      return;
    }

    const unfilled: string[] = [];

    if (!companyName.trim()) unfilled.push('Company / Trade Name');
    
    if (!tinNumber.trim()) {
      unfilled.push('TIN Number');
    } else {
      const cleanDigits = tinNumber.replace(/\D/g, '');
      if (!isBranch && cleanDigits.length < 9) {
        unfilled.push('TIN Number (Requires 9 numeric digits for Head Office)');
      }
      if (isBranch && cleanDigits.length < 12) {
        unfilled.push('TIN Number (Requires 12 numeric digits including 3-digit branch suffix)');
      }
    }

    if (!streetBuilding.trim()) unfilled.push('Street / Building / Suite Address');
    if (!province.trim()) unfilled.push('Province / Region Selection');
    if (!cityMunicipality.trim()) unfilled.push('City / Municipality Selection');
    if (!barangay.trim()) unfilled.push('Barangay Selection');

    if (!rdoNumber.trim()) unfilled.push('BIR RDO Number');
    if (!accountingPeriod) unfilled.push('Accounting Period (Calendar or Fiscal)');
    if (!registrationMethod) unfilled.push('Registration Method (Manual or eFPS)');
    if (!entityType) unfilled.push('Business Entity Type');

    if (entityType === 'Proprietor') {
      if (!proprietorFirstName.trim()) unfilled.push('Proprietor First Name');
      if (!proprietorLastName.trim()) unfilled.push('Proprietor Last Name');
    } else if (entityType === 'Corporation' || entityType === 'Partnership') {
      if (!secRegistrationNumber.trim()) unfilled.push('SEC Registration Number');
    }

    if (selectedNatures.length === 0) unfilled.push('Nature of Business (at least 1 nature selection required)');
    if (selectedBirServices.length === 0) unfilled.push('BIR Tax Services Checklist (at least 1 BIR form required)');
    if (selectedBenefits.length === 0) unfilled.push('Employee Benefits & Loans Remittances (at least 1 benefit required)');
    if (!status) unfilled.push('Client Status (Active, Inactive, or For Compliance)');
    if (isSuperAdmin && (retainersFee === '' || Number(retainersFee) <= 0)) unfilled.push('Monthly Retainers Fee');

    if (unfilled.length > 0) {
      setUnfilledFields(unfilled);
      setShowUnfilledAlert(true);
      return;
    }

    const parentObj = isBranch && parentClientId ? clients.find(c => c.id === parentClientId) : undefined;
    const computedBaseTin = extractBaseTin(tinNumber);

    let finalTin = tinNumber.trim();
    if (!isBranch) {
      const digits = finalTin.replace(/\D/g, '').slice(0, 9);
      finalTin = `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 9)}-000`;
    }

    const fullAddress = [streetBuilding, barangay, cityMunicipality, province]
      .map(s => s.trim())
      .filter(Boolean)
      .join(', ');

    const clientData: Omit<ClientProfile, 'id' | 'createdAt' | 'updatedAt'> = {
      companyName: companyName.trim(),
      tinNumber: finalTin,
      address: fullAddress || address,
      zipCode: zipCode.trim(),
      psicCode: psicCode.trim(),
      rdoNumber: rdoNumber.trim(),
      accountingPeriod: accountingPeriod as 'Calendar' | 'Fiscal',
      fiscalYearEndMonth: accountingPeriod === 'Fiscal' ? fiscalYearEndMonth : undefined,
      fiscalYearEndDay: accountingPeriod === 'Fiscal' ? fiscalYearEndDay : undefined,
      isBranch,
      parentClientId: isBranch ? parentClientId : undefined,
      parentClientName: isBranch && parentObj ? parentObj.companyName : undefined,
      branchCode: isBranch ? (branchCode || '001') : '000',
      baseTin: computedBaseTin,
      businessNature: selectedNatures,
      status: status as 'Active' | 'Inactive' | 'For Compliance',
      registrationMethod: registrationMethod as 'Manual' | 'eFPS',
      entityType: entityType as EntityType,
      secRegistrationNumber: entityType !== 'Proprietor' ? secRegistrationNumber : undefined,
      annualMeetingDate: entityType !== 'Proprietor' ? annualMeetingDate : undefined,
      dtiRegistrationNumber: entityType === 'Proprietor' ? dtiRegistrationNumber : undefined,
      dtiExpirationDate: entityType === 'Proprietor' ? dtiExpirationDate : undefined,
      proprietorFirstName: entityType === 'Proprietor' ? proprietorFirstName : undefined,
      proprietorLastName: entityType === 'Proprietor' ? proprietorLastName : undefined,
      proprietorMiddleName: entityType === 'Proprietor' ? proprietorMiddleName : undefined,
      birTaxServices: selectedBirServices,
      benefitsServices: selectedBenefits,
      contactPerson,
      mobileNumber,
      telephoneNumber,
      emailAddress,
      assignedStaffId,
      assignedStaffName,
      retainersFee: Number(retainersFee) || 0,
      notes,
    };

    if (editingClient) {
      const removedBir = (editingClient.birTaxServices || []).filter(s => !selectedBirServices.includes(s));
      const removedBen = (editingClient.benefitsServices || []).filter(s => !selectedBenefits.includes(s));

      if ((removedBir.length > 0 || removedBen.length > 0) && !showUnenrollConfirmationModal) {
        setRemovedBirList(removedBir);
        setRemovedBenList(removedBen);
        setPendingClientDataToSave(clientData);
        setShowUnenrollConfirmationModal(true);
        return;
      }

      executeClientUpdate(clientData);
    } else {
      const newClient = addClient(clientData);
      if (createdExclusiveCodes.length > 0 && newClient?.id) {
        masterChoices.benefitsOptions.forEach(opt => {
          if (createdExclusiveCodes.includes(opt.code) && opt.isExclusiveToClient) {
            updateMasterBenefitsOption(opt.id, {
              ...opt,
              exclusiveClientId: newClient.id,
              exclusiveClientName: companyName.trim()
            });
          }
        });
      }
      addAuditLog('Client Registered', `Registered new client ${companyName}`, currentUser?.id || '', currentUser?.fullName || '');
      onClose();
    }
  };

  const executeClientUpdate = (clientDataToSave: any) => {
    if (!editingClient) return;
    updateClient(editingClient.id, clientDataToSave);
    if (createdExclusiveCodes.length > 0) {
      masterChoices.benefitsOptions.forEach(opt => {
        if (createdExclusiveCodes.includes(opt.code) && opt.isExclusiveToClient) {
          updateMasterBenefitsOption(opt.id, {
            ...opt,
            exclusiveClientId: editingClient.id,
            exclusiveClientName: companyName.trim()
          });
        }
      });
    }
    addAuditLog('Client Profile Updated', `Updated client ${companyName}`, currentUser?.id || '', currentUser?.fullName || '');
    setShowUnenrollConfirmationModal(false);
    onClose();
  };

  const filteredNatures = masterChoices.businessNatures.filter(n => 
    n.toLowerCase().includes(natureSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {editingClient ? 'Edit Client Profile' : 'New Client Registration'}
              </h3>
              <p className="text-xs text-slate-400">
                AFMS Client Master Profile & Statutory Tax Registration
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          
          {/* Section 1: Core Client Information */}
          <div className="bg-slate-950/50 p-4 border border-slate-800 rounded-xl space-y-4">
            <h4 className="font-bold text-slate-200 text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              Core Company Profile
            </h4>

            {/* Office Classification & Parent-Child Relationship ⭐ */}
            <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-slate-300 font-bold text-xs flex items-center gap-1.5">
                  <GitFork className="w-4 h-4 text-indigo-400" />
                  Office Designation & Branch Relationship
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-300">
                    <input
                      type="radio"
                      name="officeDesignation"
                      checked={!isBranch}
                      onChange={() => {
                        setIsBranch(false);
                        setParentClientId('');
                        setBranchCode('000');
                        if (tinNumber) {
                          const base = extractBaseTin(tinNumber);
                          setTinNumber(`${base}-000`);
                        }
                      }}
                      className="text-indigo-500 focus:ring-indigo-500"
                    />
                    <span>Head / Main Office (-000)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-indigo-400">
                    <input
                      type="radio"
                      name="officeDesignation"
                      checked={isBranch}
                      onChange={() => {
                        setIsBranch(true);
                        setBranchCode('001');
                      }}
                      className="text-indigo-500 focus:ring-indigo-500"
                    />
                    <span>Branch Office (-001, -002...)</span>
                  </label>
                </div>
              </div>

              {isBranch && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                  <div>
                    <label className="block text-slate-400 font-medium mb-1 text-[11px]">Select Parent / Main Office Client *</label>
                    <select
                      value={parentClientId}
                      onChange={e => {
                        const pid = e.target.value;
                        setParentClientId(pid);
                        const parent = clients.find(c => c.id === pid);
                        if (parent) {
                          const base = extractBaseTin(parent.tinNumber);
                          setTinNumber(formatFullTin(base, branchCode || '001'));
                        }
                      }}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-medium text-xs focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">-- Choose Head Office / Parent --</option>
                      {clients.filter(c => !editingClient || c.id !== editingClient.id).map(c => (
                        <option key={c.id} value={c.id}>
                          {c.companyName} (TIN: {c.tinNumber})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-medium mb-1 text-[11px]">Branch Code Suffix *</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="001"
                        maxLength={5}
                        value={branchCode}
                        onChange={e => {
                          const bc = e.target.value;
                          setBranchCode(bc);
                          if (tinNumber) {
                            const base = extractBaseTin(tinNumber);
                            setTinNumber(formatFullTin(base, bc));
                          }
                        }}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold text-xs focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (tinNumber) {
                            const base = extractBaseTin(tinNumber);
                            setTinNumber(formatFullTin(base, branchCode || '001'));
                          }
                        }}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-[11px] whitespace-nowrap cursor-pointer flex items-center gap-1"
                      >
                        <Link className="w-3.5 h-3.5" /> Link TIN
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Registration Method & Business Entity Type (Placed Above Company Name) ⭐ */}
            <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-bold text-xs mb-2">
                  Registration Method *
                </label>
                <div className="flex gap-4 items-center h-[38px] px-3 bg-slate-800 border border-slate-700 rounded-lg">
                  {(['Manual', 'eFPS'] as const).map(m => (
                    <label key={m} className="flex items-center gap-2 cursor-pointer text-slate-300 text-xs font-medium">
                      <input
                        type="radio"
                        name="regMethod"
                        checked={registrationMethod === m}
                        onChange={() => setRegistrationMethod(m)}
                        className="text-blue-500 focus:ring-blue-500 cursor-pointer"
                      />
                      <span>{m}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold text-xs mb-2">
                  Business Entity Type *
                </label>
                <div className="flex gap-4 items-center h-[38px] px-3 bg-slate-800 border border-slate-700 rounded-lg">
                  {(['Proprietor', 'Corporation', 'Partnership'] as const).map(e => (
                    <label key={e} className="flex items-center gap-2 cursor-pointer text-slate-300 text-xs font-medium">
                      <input
                        type="radio"
                        name="entityType"
                        checked={entityType === e}
                        onChange={() => setEntityType(e)}
                        className="text-blue-500 focus:ring-blue-500 cursor-pointer"
                      />
                      <span>{e}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-slate-400 font-medium mb-1">Company / Trade Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. San Miguel Logistics & Trading Corp."
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">TIN Number *</label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    required
                    placeholder={!isBranch ? "000-000-000" : "000-000-000-001"}
                    value={tinNumber}
                    onChange={e => handleTinChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono focus:ring-2 focus:ring-blue-500 pr-16"
                  />
                  {!isBranch && (
                    <span className="absolute right-2 text-xs font-mono font-bold text-indigo-400 bg-slate-900 px-2 py-1 rounded border border-indigo-800/60">
                      -000
                    </span>
                  )}
                </div>
                {!isBranch && (
                  <p className="text-[10px] text-slate-400 font-medium mt-1">
                    Enter 9-digit base TIN. Main office suffix (-000) is locked automatically.
                  </p>
                )}
              </div>

              {/* Separated Business Address Inputs with Philippine Geographic Cascading Dropdowns ⭐ */}
              <div className="md:col-span-3 p-3.5 bg-slate-900/80 border border-slate-700/80 rounded-xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <label className="text-slate-200 font-bold text-xs flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    Registered Business Address (Philippine Cascading Selection)
                  </label>
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded-full font-mono font-medium">
                    Province → City → Barangay Auto-Cascade
                  </span>
                </div>

                {/* 2-Row Responsive Layout for Business Address ⭐ */}
                <div className="space-y-3">
                  {/* Row 1: Street Address (3 cols) + Zip Code (1 col) */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="md:col-span-3">
                      <label className="block text-slate-400 font-medium mb-1 text-[11px]">Street / Building / Suite *</label>
                      <input
                        type="text"
                        placeholder="e.g. Suite 1204, Cyberpark"
                        value={streetBuilding}
                        onChange={e => setStreetBuilding(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:ring-2 focus:ring-blue-500 font-medium"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-slate-400 font-medium mb-1 text-[11px]">Zip Code (4 Digits)</label>
                      <input
                        type="text"
                        placeholder="e.g. 1100"
                        maxLength={4}
                        value={zipCode}
                        onChange={e => setZipCode(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-xs focus:ring-2 focus:ring-blue-500 font-medium"
                      />
                    </div>
                  </div>

                  {/* Row 2: Province / Region + City / Municipality + Barangay */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Province / Region Dropdown */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-slate-400 font-medium text-[11px]">Province / Region *</label>
                        <button
                          type="button"
                          onClick={() => {
                            setIsCustomProvince(!isCustomProvince);
                            if (!isCustomProvince) setProvince('');
                          }}
                          className="text-[10px] text-indigo-400 hover:text-indigo-300 hover:underline"
                        >
                          {isCustomProvince ? 'Select Preset' : '+ Type Custom'}
                        </button>
                      </div>
                      {isCustomProvince ? (
                        <input
                          type="text"
                          placeholder="Type Province name"
                          value={province}
                          onChange={e => setProvince(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:ring-2 focus:ring-blue-500 font-medium"
                        />
                      ) : (
                        <select
                          value={province}
                          onChange={e => handleProvinceChange(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs font-medium focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">-- Choose Province / Region --</option>
                          {availableProvinces.map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                          <option value="__CUSTOM__">+ Other / Type Custom Province...</option>
                        </select>
                      )}
                    </div>

                    {/* City / Municipality Dropdown */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-slate-400 font-medium text-[11px]">City / Municipality *</label>
                        <button
                          type="button"
                          onClick={() => {
                            setIsCustomCity(!isCustomCity);
                            if (!isCustomCity) setCityMunicipality('');
                          }}
                          className="text-[10px] text-indigo-400 hover:text-indigo-300 hover:underline"
                        >
                          {isCustomCity ? 'Select Preset' : '+ Type Custom'}
                        </button>
                      </div>
                      {isCustomCity ? (
                        <input
                          type="text"
                          placeholder="Type City / Municipality"
                          value={cityMunicipality}
                          onChange={e => setCityMunicipality(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:ring-2 focus:ring-blue-500 font-medium"
                        />
                      ) : (
                        <select
                          value={cityMunicipality}
                          onChange={e => handleCityChange(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs font-medium focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">
                            {province ? `-- Choose City in ${province} --` : '-- Choose City / Municipality --'}
                          </option>
                          {availableCities.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                          <option value="__CUSTOM__">+ Other / Type Custom City...</option>
                        </select>
                      )}
                    </div>

                    {/* Barangay Dropdown */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-slate-400 font-medium text-[11px]">Barangay *</label>
                        <button
                          type="button"
                          onClick={() => {
                            setIsCustomBarangay(!isCustomBarangay);
                            if (!isCustomBarangay) setBarangay('');
                          }}
                          className="text-[10px] text-indigo-400 hover:text-indigo-300 hover:underline"
                        >
                          {isCustomBarangay ? 'Select Preset' : '+ Type Custom'}
                        </button>
                      </div>
                      {isCustomBarangay ? (
                        <input
                          type="text"
                          placeholder="Type Barangay name"
                          value={barangay}
                          onChange={e => setBarangay(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:ring-2 focus:ring-blue-500 font-medium"
                        />
                      ) : (
                        <select
                          value={barangay}
                          onChange={e => handleBarangayChange(e.target.value)}
                          disabled={!cityMunicipality && availableBarangays.length === 0}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                          <option value="">
                            {cityMunicipality ? `-- Choose Barangay in ${cityMunicipality} --` : '-- Select City First --'}
                          </option>
                          {availableBarangays.map(b => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                          <option value="__CUSTOM__">+ Other / Type Custom Barangay...</option>
                        </select>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* RDO Number & Accounting Period side-by-side ⭐ */}
              <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">BIR RDO Number (3 Digits) *</label>
                  <input
                    type="text"
                    required
                    maxLength={3}
                    placeholder="038"
                    value={rdoNumber}
                    onChange={e => setRdoNumber(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono uppercase focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    Accounting Period *
                  </label>
                  <div className="flex gap-4 items-center h-[42px] px-3 bg-slate-800 border border-slate-700 rounded-lg">
                    {(['Calendar', 'Fiscal'] as const).map(ap => (
                      <label key={ap} className="flex items-center gap-2 cursor-pointer text-slate-300 text-xs font-medium">
                        <input
                          type="radio"
                          name="accountingPeriod"
                          value={ap}
                          checked={accountingPeriod === ap}
                          onChange={() => setAccountingPeriod(ap)}
                          className="text-blue-500 focus:ring-blue-500 cursor-pointer"
                        />
                        <span>{ap === 'Calendar' ? 'Calendar Year (Jan-Dec)' : 'Fiscal Year'}</span>
                      </label>
                    ))}
                  </div>

                  {accountingPeriod === 'Fiscal' && (
                    <div className="mt-2.5 p-3 bg-purple-950/60 border border-purple-700/80 rounded-xl space-y-2 text-xs">
                      <label className="block text-purple-300 font-bold text-xs">
                        Select Fiscal Year Ending Period (Month & Day) *
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-slate-400 text-[10px] mb-1 font-semibold">Fiscal Ending Month</label>
                          <select
                            value={fiscalYearEndMonth}
                            onChange={e => setFiscalYearEndMonth(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-bold text-xs"
                          >
                            {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-slate-400 text-[10px] mb-1 font-semibold">Fiscal Ending Day</label>
                          <select
                            value={fiscalYearEndDay}
                            onChange={e => setFiscalYearEndDay(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-bold text-xs"
                          >
                            {Array.from({ length: 31 }, (_, i) => String(i + 1)).map(d => (
                              <option key={d} value={d}>Day {d}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <p className="text-[11px] text-purple-200 font-medium">
                        Selected Period: <strong className="text-emerald-400">Fiscal Year Ended {fiscalYearEndMonth} {fiscalYearEndDay}</strong>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Conditional Entity Information */}
            {entityType === 'Corporation' || entityType === 'Partnership' ? (
              <div className="p-3 bg-blue-950/30 border border-blue-800/40 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                <div>
                  <label className="block text-blue-300 font-medium mb-1">SEC Registration Number</label>
                  <input
                    type="text"
                    placeholder="e.g. CS2015098712"
                    value={secRegistrationNumber}
                    onChange={e => setSecRegistrationNumber(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-blue-300 font-medium mb-1">Annual Stockholders Meeting Date</label>
                  <input
                    type="date"
                    value={annualMeetingDate}
                    onChange={e => setAnnualMeetingDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-white"
                  />
                </div>
              </div>
            ) : entityType === 'Proprietor' ? (
              <div className="p-3 bg-indigo-950/30 border border-indigo-800/40 rounded-lg space-y-3 mt-2">
                <p className="font-semibold text-indigo-300 text-[11px]">Proprietor & DTI Information</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">First Name</label>
                    <input
                      type="text"
                      placeholder="First Name"
                      value={proprietorFirstName}
                      onChange={e => setProprietorFirstName(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Middle Name</label>
                    <input
                      type="text"
                      placeholder="Middle Name"
                      value={proprietorMiddleName}
                      onChange={e => setProprietorMiddleName(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Last Name</label>
                    <input
                      type="text"
                      placeholder="Last Name"
                      value={proprietorLastName}
                      onChange={e => setProprietorLastName(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">DTI Registration Number</label>
                    <input
                      type="text"
                      placeholder="DTI-2022-XXXXX"
                      value={dtiRegistrationNumber}
                      onChange={e => setDtiRegistrationNumber(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">DTI Certificate Expiration Date</label>
                    <input
                      type="date"
                      value={dtiExpirationDate}
                      onChange={e => setDtiExpirationDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-white"
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Section 2: Business Nature (Checklist with Search & Custom Item Addition) */}
          <div className="bg-slate-950/50 p-4 border border-slate-800 rounded-xl space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                Nature of Business (Checklist with Search)
              </h4>
              <span className="text-[11px] text-indigo-400">{selectedNatures.length} selected</span>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search business nature choices..."
                value={natureSearch}
                onChange={e => setNatureSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-white text-xs"
              />
            </div>

            {/* Checklist Box */}
            <div className="max-h-36 overflow-y-auto border border-slate-800 rounded-lg p-2 bg-slate-900 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {filteredNatures.map(nature => {
                const isSelected = selectedNatures.includes(nature);
                return (
                  <button
                    type="button"
                    key={nature}
                    onClick={() => toggleNature(nature)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition-colors ${
                      isSelected ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/40 font-semibold' : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${isSelected ? 'bg-indigo-500 border-indigo-400 text-white' : 'border-slate-600'}`}>
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                    <span className="truncate">{nature}</span>
                  </button>
                );
              })}
            </div>

            {/* Add Manual PSIC Code & Nature of Business Input (3 Textboxes) ⭐ */}
            <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-xl space-y-2">
              <label className="block text-slate-200 font-bold text-xs flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Manual PSIC Code & Nature of Business Registration
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">1. PSIC Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 6920"
                    value={manualPsicInput}
                    onChange={e => setManualPsicInput(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">2. Nature of Business</label>
                  <input
                    type="text"
                    placeholder="e.g. Accounting & Auditing"
                    value={manualNatureDescInput}
                    onChange={e => setManualNatureDescInput(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">3. Line of Business</label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="e.g. Tax & Bookkeeping"
                      value={manualLineOfBusinessInput}
                      onChange={e => setManualLineOfBusinessInput(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!manualNatureDescInput.trim() && !manualLineOfBusinessInput.trim() && !manualPsicInput.trim()) return;
                        const parts = [];
                        if (manualPsicInput.trim()) parts.push(manualPsicInput.trim());
                        if (manualNatureDescInput.trim()) parts.push(manualNatureDescInput.trim());
                        if (manualLineOfBusinessInput.trim()) parts.push(`(${manualLineOfBusinessInput.trim()})`);
                        const formatted = parts.join(' - ');
                        if (!selectedNatures.includes(formatted)) {
                          setSelectedNatures([...selectedNatures, formatted]);
                        }
                        if (manualPsicInput.trim()) {
                          setPsicCode(manualPsicInput.trim());
                        }
                        addMasterBusinessNature(formatted);
                        setManualPsicInput('');
                        setManualNatureDescInput('');
                        setManualLineOfBusinessInput('');
                      }}
                      className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs whitespace-nowrap cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: BIR Tax Services & Custom Deadline Functionality */}
          <div className="bg-slate-950/50 p-4 border border-slate-800 rounded-xl space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  BIR Tax Services Checklist & Recurring Deadlines *
                </h4>
                <p className="text-[11px] text-slate-400">Select applicable BIR filings or define custom deadline rules.</p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddBirModal(true)}
                className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 rounded font-medium text-[11px] flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Tax Option
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {(masterChoices.birTaxOptions || []).map(opt => {
                const isChecked = selectedBirServices.includes(opt.code);
                const upperCode = opt.code.toUpperCase();
                
                // Find matching form linkages rule
                const linkedRule = (masterChoices.formLinkages || []).find(
                  l => l.primaryCode.toUpperCase() === upperCode || (l.linkedCodes || []).map(c => c.toUpperCase()).includes(upperCode)
                );

                return (
                  <div
                    key={opt.id}
                    onClick={() => toggleBirServiceWithInterlinks(opt.code)}
                    className={`p-2.5 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
                      isChecked ? 'bg-amber-950/30 border-amber-500/50 text-white' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between font-bold text-xs">
                        <span className={isChecked ? 'text-amber-400' : 'text-slate-300'}>{opt.code}</span>
                        {isChecked && <Check className="w-3.5 h-3.5 text-amber-400" />}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{opt.name}</p>
                      {opt.customDescription && (
                        <p className="text-[9px] text-amber-300/80 mt-0.5">{opt.customDescription}</p>
                      )}
                    </div>

                    {linkedRule && (
                      <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center gap-1 text-[9px]">
                        <Sparkles className="w-3 h-3 text-indigo-400 shrink-0" />
                        <span className="text-indigo-300/90 font-mono font-medium truncate">
                          Linked: {(linkedRule.linkedCodes || []).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 4: Employee Benefits Statutory Remittances & Loans (Parent-Child Hierarchy Mapping) */}
          <div className="bg-slate-950/50 p-4 border border-slate-800 rounded-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Employee Benefits & Loans Remittances (Parent ➔ Child Hierarchy) *
                </h4>
                <p className="text-[11px] text-slate-400">
                  Organized by Parent Agency (HDMF, SSS, PhilHealth). Add multiple sub-loans or custom payments under any parent.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedParentForAddBenefit('HDMF (Pag-IBIG Fund)');
                  setShowAddBenefitsModal(true);
                }}
                className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 rounded-lg font-semibold text-[11px] flex items-center gap-1.5 self-start sm:self-auto transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" /> Add Custom Sub-Loan / Item
              </button>
            </div>

            {/* Hierarchical Parent Group Cards */}
            <div className="space-y-3">
              {(Object.entries(groupedBenefits) as [string, CustomDeadlineRule[]][]).map(([parentAgency, items]) => {
                if (!items || items.length === 0) return null;

                const parentCheckedCount = items.filter(it => selectedBenefits.includes(it.code)).length;
                const isAllChecked = items.length > 0 && parentCheckedCount === items.length;

                const toggleAllParentItems = () => {
                  if (isAllChecked) {
                    const codesToRemove = items.map(it => it.code);
                    setSelectedBenefits(selectedBenefits.filter(b => !codesToRemove.includes(b)));
                  } else {
                    const codesToAdd = items.map(it => it.code).filter(c => !selectedBenefits.includes(c));
                    setSelectedBenefits([...selectedBenefits, ...codesToAdd]);
                  }
                };

                return (
                  <div key={parentAgency} className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2.5">
                    {/* Parent Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800/60 rounded font-bold text-[10px] uppercase tracking-wider">
                          Parent Agency
                        </span>
                        <h5 className="font-bold text-slate-100 text-xs flex items-center gap-1.5">
                          {parentAgency}
                        </h5>
                        <span className="text-[10px] text-slate-400 font-medium bg-slate-800 px-2 py-0.5 rounded-full">
                          {parentCheckedCount} / {items.length} selected
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={toggleAllParentItems}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-semibold transition-colors"
                        >
                          {isAllChecked ? 'Deselect All' : 'Select All Children'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedParentForAddBenefit(parentAgency);
                            setShowAddBenefitsModal(true);
                          }}
                          className="px-2 py-1 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/60 rounded text-[10px] font-semibold flex items-center gap-1 transition-colors"
                        >
                          <Plus className="w-3 h-3 text-emerald-400" /> + Add Loan under {parentAgency.split(' ')[0]}
                        </button>
                      </div>
                    </div>

                    {/* Child Options Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-0.5">
                      {items.map(child => {
                        const isChecked = selectedBenefits.includes(child.code);
                        return (
                          <div
                            key={child.id}
                            onClick={() => {
                              if (isChecked) {
                                setSelectedBenefits(selectedBenefits.filter(b => b !== child.code));
                              } else {
                                setSelectedBenefits([...selectedBenefits, child.code]);
                              }
                            }}
                            className={`p-2.5 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
                              isChecked
                                ? 'bg-emerald-950/40 border-emerald-500/60 text-white shadow-xs'
                                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-1 font-bold text-xs">
                                <span className={`flex items-center gap-1 ${isChecked ? 'text-emerald-400' : 'text-slate-200'}`}>
                                  <span className="text-slate-500 font-mono text-[10px]">↳</span>
                                  {child.code}
                                </span>
                                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                  isChecked ? 'bg-emerald-500 border-emerald-400 text-slate-950' : 'border-slate-700'
                                }`}>
                                  {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                              </div>
                              <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{child.name}</p>
                              {child.isExclusiveToClient && (
                                <span className="inline-block mt-1 px-1.5 py-0.5 bg-amber-950 text-amber-300 border border-amber-800/80 rounded text-[9px] font-bold">
                                  🔒 Exclusive to Client
                                </span>
                              )}
                            </div>

                            <div className="mt-2 pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[9px] text-slate-500">
                              <span>Due {child.deadlineDay || 15}th</span>
                              <span className="uppercase px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded font-mono">
                                {child.frequency || 'Monthly'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 5: Client Status, Retainer Fee & Super Admin Controls */}
          <div className="bg-slate-950/50 p-4 border border-slate-800 rounded-xl space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Client Status *
                </label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as any)}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-white font-medium focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select Client Status * --</option>
                  <option value="Active">🟢 Active</option>
                  <option value="For Compliance">🟡 For Compliance</option>
                  <option value="Inactive">🔴 Inactive</option>
                </select>
              </div>

              {/* SUPER ADMIN ONLY VISIBILITY OF RETAINERS FEE */}
              {isSuperAdmin ? (
                <div className="p-2.5 bg-amber-950/30 border border-amber-800/40 rounded-lg">
                  <label className="block text-amber-300 font-bold mb-1 text-[11px] flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                    Monthly Retainers Fee *
                  </label>
                  <CurrencyInput
                    placeholder="25,000.00"
                    value={retainersFee}
                    onChange={val => setRetainersFee(val)}
                    className="w-full bg-slate-900 border border-amber-700/60 rounded text-amber-300 font-mono font-bold text-xs"
                  />
                </div>
              ) : (
                <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg flex items-center text-slate-500 italic text-[11px]">
                  Retainers fee is confidential & visible only to Super Admins.
                </div>
              )}

              <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-bold text-xs flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                    Staff Assignment (BIR &amp; Benefits)
                  </label>
                  <span className="text-[10px] font-semibold text-indigo-300 bg-indigo-950/80 border border-indigo-800 px-2 py-0.5 rounded-full">
                    Configured in User Management
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Staff for <strong>BIR Tax Services</strong> and <strong>Statutory Benefits</strong> can be assigned to <strong>1 or more accountants</strong> in <span className="text-indigo-300 font-medium">User Management &amp; Role-Based Access Control</span>.
                </p>
              </div>
            </div>

            {/* Client Status Definitions Guide Card ⭐ */}
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2 text-xs">
              <span className="font-bold text-slate-300 text-[11px] uppercase tracking-wider block">
                Client Status Definitions & Guidelines
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                <div className={`p-2.5 rounded-lg border transition-all ${
                  status === 'Active'
                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-100 ring-1 ring-emerald-500'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400'
                }`}>
                  <span className="font-bold text-emerald-400 flex items-center gap-1.5 mb-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Active
                  </span>
                  <p className="text-[11px] leading-relaxed">
                    The client is actively operating and is regularly filing tax returns, paying taxes, and complying with all applicable BIR requirements. All recurring tax obligations and deadlines remain active and are monitored by the accounting firm.
                  </p>
                </div>

                <div className={`p-2.5 rounded-lg border transition-all ${
                  status === 'For Compliance'
                    ? 'bg-amber-950/60 border-amber-500 text-amber-100 ring-1 ring-amber-500'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400'
                }`}>
                  <span className="font-bold text-amber-400 flex items-center gap-1.5 mb-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span> 🟡 For Compliance
                  </span>
                  <p className="text-[11px] leading-relaxed">
                    The client has ceased or temporarily suspended business operations but still has outstanding BIR compliance obligations. The company may still be required to file tax returns (including &quot;No Payment&quot; or &quot;No Operation&quot; returns, where applicable), settle open cases, submit documentary requirements, or complete the business closure process until the BIR officially approves the closure or cancellation of registration.
                  </p>
                </div>

                <div className={`p-2.5 rounded-lg border transition-all ${
                  status === 'Inactive'
                    ? 'bg-rose-950/60 border-rose-500 text-rose-100 ring-1 ring-rose-500'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400'
                }`}>
                  <span className="font-bold text-rose-400 flex items-center gap-1.5 mb-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span> 🔴 Inactive
                  </span>
                  <p className="text-[11px] leading-relaxed">
                    The client is no longer under the firm&apos;s active management. This status applies to companies whose BIR registration has been officially closed or cancelled, or whose accounting and tax compliance services have been transferred to another accounting firm or accountant. No recurring compliance tasks are generated, but historical records remain available for reference.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 6: Additional Contact Information */}
          <div className="bg-slate-950/50 p-4 border border-slate-800 rounded-xl space-y-3">
            <h4 className="font-bold text-slate-200 text-sm">Contact Persons & Notes</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Contact Person</label>
                <input
                  type="text"
                  placeholder="e.g. Ms. Sarah Lee"
                  value={contactPerson}
                  onChange={e => setContactPerson(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Mobile Number</label>
                <input
                  type="text"
                  placeholder="+63 917 000 0000"
                  value={mobileNumber}
                  onChange={e => setMobileNumber(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="finance@client.ph"
                  value={emailAddress}
                  onChange={e => setEmailAddress(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Special Handling Notes</label>
              <textarea
                rows={2}
                placeholder="Important client instructions or tax notes..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white"
              />
            </div>
          </div>

          {/* Footer Submit Button */}
          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-2"
            >
              <Check className="w-4 h-4" /> Save Client Profile
            </button>
          </div>

        </form>

        {/* Modal for adding custom BIR Deadline Rule */}
        {showAddBirModal && (
          <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 max-w-md w-full space-y-4 text-xs max-h-[90vh] overflow-y-auto my-auto">
              <h4 className="font-bold text-white text-sm">Add New Custom BIR Form / Rule</h4>
              <div>
                <label className="block text-slate-400 mb-1">Form Code (e.g. 2551Q, 1601C)</label>
                <input
                  type="text"
                  placeholder="1601C"
                  value={newBirCode}
                  onChange={e => setNewBirCode(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-white uppercase font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Form Title</label>
                <input
                  type="text"
                  placeholder="Monthly Compensation Withholding Tax"
                  value={newBirName}
                  onChange={e => setNewBirName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Deadline Rule Description</label>
                <input
                  type="text"
                  placeholder="e.g. Every 10th of every month"
                  value={newBirDesc}
                  onChange={e => setNewBirDesc(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddBirModal(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddCustomBirOption}
                  className="px-3 py-1.5 bg-amber-500 text-slate-950 font-bold rounded cursor-pointer"
                >
                  Save & Add
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal for adding custom Employee Benefits Statutory Item */}
        {showAddBenefitsModal && (
          <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 max-w-md w-full space-y-4 text-xs max-h-[90vh] overflow-y-auto my-auto">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Add New Child Loan / Benefit Item
              </h4>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Select Parent Agency / Category *</label>
                <select
                  value={selectedParentForAddBenefit}
                  onChange={e => setSelectedParentForAddBenefit(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-white font-semibold"
                >
                  <option value="HDMF (Pag-IBIG Fund)">HDMF (Pag-IBIG Fund)</option>
                  <option value="SSS (Social Security System)">SSS (Social Security System)</option>
                  <option value="PhilHealth (PHIC)">PhilHealth (PHIC)</option>
                  <option value="Other Statutory / Custom Benefits">Other Statutory / Custom Benefits</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Child Loan Code / Short Name (e.g. HDMF Housing Loan #2)</label>
                <input
                  type="text"
                  placeholder="e.g. HDMF Housing Loan #2"
                  value={newBenCode}
                  onChange={e => setNewBenCode(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Full Sub-Item Title</label>
                <input
                  type="text"
                  placeholder="e.g. Pag-IBIG Secondary Housing Loan Amortization"
                  value={newBenName}
                  onChange={e => setNewBenName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Remittance Description / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Due every 15th of the month"
                  value={newBenDesc}
                  onChange={e => setNewBenDesc(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-white"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-amber-300 font-semibold p-2 bg-amber-950/40 border border-amber-800/60 rounded-lg">
                  <input
                    type="checkbox"
                    checked={newBenIsExclusive}
                    onChange={e => setNewBenIsExclusive(e.target.checked)}
                    className="rounded text-amber-500 focus:ring-amber-500"
                  />
                  <span>Exclusive to this Client ({companyName || 'Current Client'})</span>
                </label>
                <p className="text-[10px] text-slate-400 mt-1 pl-1">
                  If checked, this sub-loan/item will only be registered and visible for this client profile.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddBenefitsModal(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded cursor-pointer hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddCustomBenefitsOption}
                  className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded cursor-pointer shadow-md shadow-emerald-500/20"
                >
                  Save & Add Child Item
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Unfilled Required Items Alert Modal ⭐ */}
        {showUnfilledAlert && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-slate-900 border-2 border-rose-500/80 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-400 shrink-0">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Unfilled Required Items</h3>
                  <p className="text-xs text-rose-300/90 mt-0.5">
                    Please complete all required fields listed below before saving client profile:
                  </p>
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs">
                {unfilledFields.map((field, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-rose-200 font-medium bg-rose-950/40 p-2 rounded-lg border border-rose-800/50">
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                    <span>{field}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowUnfilledAlert(false)}
                  className="w-full sm:w-auto px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" /> I Will Complete Required Fields
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal when unchecking/unenrolling forms ⭐ */}
        {showUnenrollConfirmationModal && pendingClientDataToSave && (
          <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-slate-900 space-y-4 text-xs">
              
              <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-2xl shrink-0">
                    <ShieldAlert className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900">Confirm Profile Update & Archival</h3>
                    <p className="text-xs font-bold text-amber-700 mt-0.5">Tax Forms or Benefit Services Unenrolled</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowUnenrollConfirmationModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-slate-600 leading-relaxed font-medium">
                You are unchecking/unenrolling the following services from <strong>{companyName}</strong>'s profile:
              </p>

              <div className="space-y-2 bg-slate-50 border border-slate-200 rounded-xl p-3">
                {removedBirList.length > 0 && (
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-amber-800 tracking-wider block mb-1">
                      Unenrolled BIR Tax Forms ({removedBirList.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {removedBirList.map(code => (
                        <span key={code} className="font-mono font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded text-[11px]">
                          {code}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {removedBenList.length > 0 && (
                  <div className={removedBirList.length > 0 ? "pt-2 border-t border-slate-200" : ""}>
                    <span className="text-[10px] font-extrabold uppercase text-blue-800 tracking-wider block mb-1">
                      Unenrolled Benefit Services ({removedBenList.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {removedBenList.map(code => (
                        <span key={code} className="font-mono font-bold text-blue-900 bg-blue-100 border border-blue-300 px-2 py-0.5 rounded text-[11px]">
                          {code}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3 bg-amber-50/90 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-950">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Immutable Historical Audit Trail Rule:</span>
                </div>
                <p className="leading-relaxed pl-5 text-[10.5px]">
                  Existing historical compliance records and assessed filings for these forms will <strong>NEVER be deleted</strong> and will remain preserved in the compliance log with an <span className="font-bold text-slate-800">[Unenrolled Form]</span> grey badge. Future automatic deadline generation for upcoming months will be paused.
                </p>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUnenrollConfirmationModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer"
                >
                  Cancel & Review
                </button>
                <button
                  type="button"
                  onClick={() => executeClientUpdate(pendingClientDataToSave)}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-md shadow-amber-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" /> Confirm & Preserve History
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};
