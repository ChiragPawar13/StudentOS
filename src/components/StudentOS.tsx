// @ts-nocheck
import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { streamAI, fileToDataUrl, extractFileText, NOTE_FILE_ACCEPT } from '@/lib/studentos-ai';
import {
  initializeApp, getAuth, signInAnonymously, onAuthStateChanged, updateProfile, signInWithCustomToken,
  getFirestore, collection, doc, getDoc, setDoc, addDoc, updateDoc, onSnapshot, serverTimestamp, deleteDoc
} from '@/lib/local-firebase';

const appId = 'default-studentos-app';
const app = initializeApp({});
const auth = getAuth(app);
const db = getFirestore(app);
import {
  BookOpen,
  Search,
  Camera,
  FolderOpen,
  Settings,
  ChevronRight,
  User,
  AlertCircle,
  CheckCircle2,
  Bookmark,
  FileText,
  BookMarked,
  Plus,
  Eye,
  Sparkles,
  FileUp,
  X,
  Check,
  HelpCircle,
  BrainCircuit,
  RefreshCw,
  Copy,
  Edit3,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Zap,
  Lightbulb,
  Trash2,
  Upload,
  FileCode,
  CheckSquare,
  List
} from 'lucide-react';


const PRESET_UNIVERSITIES = [
  'Mumbai University',
  'Pune University (SPPU)',
  'Delhi Technological University (DTU)',
  'VIT Vellore',
  'BITS Pilani',
  'IIT Bombay',
  'AKTU Lucknow',
  'GTU Gujarat',
  'Anna University',
  'VTU Karnataka',
  'RGPV Bhopal',
  'Amity University',
  'Lovely Professional University (LPU)',
  'Other (Type Custom University)'
];

const PRESET_BRANCHES = [
  'Computer Science & Engineering (CSE)',
  'Artificial Intelligence & Machine Learning (AI/ML)',
  'Data Science & Analytics',
  'Information Technology (IT)',
  'Cyber Security & Forensics',
  'Electronics & Communication Engineering (ECE)',
  'Electrical & Electronics Engineering (EEE)',
  'Mechanical Engineering',
  'Civil Engineering',
  'Chemical Engineering',
  'Aerospace & Aeronautical Engineering',
  'Robotics & Automation',
  'Other (Type Custom Branch)'
];

const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
const SEMESTERS = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6', 'Sem 7', 'Sem 8'];

const SAMPLE_FLASHCARDS = [
  {
    question: "What is 3-Schema Architecture in DBMS?",
    answer: "It divides the database into 3 levels: External (user view), Conceptual (logical structures), and Internal (physical storage) to achieve data independence."
  },
  {
    question: "Define ACID properties of a Transaction.",
    answer: "Atomicity (all or nothing), Consistency (preserves validity), Isolation (concurrent safety), and Durability (permanent changes upon commit)."
  },
  {
    question: "What is BCNF (Boyce-Codd Normal Form)?",
    answer: "A relation is in BCNF if it is in 3NF and for every functional dependency X -> Y, X must be a super key."
  }
];


const generateAICurriculum = async (contextNotes = [], subjectName = '', onText = () => {}) => {
  if (!contextNotes || contextNotes.length === 0) {
    return { text: '', error: 'Add some notes to this subject first — the syllabus is built from them.' };
  }
  try {
    const text = await streamAI({ task: 'curriculum', notes: contextNotes, subject: subjectName }, onText);
    return { text };
  } catch (e) {
    return { text: '', error: e?.message || 'Could not generate the syllabus.' };
  }
};

const FormattedAIAnswer = ({ text }) => {
  if (typeof text !== 'string') return <span>{String(text || '')}</span>;
  return (
    <div className="prose prose-sm max-w-none text-slate-800 text-sm leading-relaxed [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-slate-900 [&_h3]:mt-4 [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_p]:my-2 [&_strong]:text-slate-900 [&_pre]:bg-slate-900 [&_pre]:text-slate-100 [&_pre]:p-3 [&_pre]:rounded-xl [&_pre]:overflow-x-auto [&_code]:text-xs [&_table]:w-full [&_table]:text-xs [&_th]:border [&_th]:border-slate-200 [&_th]:bg-slate-100 [&_th]:p-2 [&_td]:border [&_td]:border-slate-200 [&_td]:p-2 [&_.katex-display]:overflow-x-auto">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{text}</ReactMarkdown>
    </div>
  );
};

const PomodoroTimer = () => {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState('study');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    let interval = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0) {
      if (mode === 'study') {
        setMode('break');
        setTimeLeft(5 * 60);
      } else {
        setMode('study');
        setTimeLeft(25 * 60);
      }
      setIsRunning(false);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft, mode]);

  const toggleTimer = () => setIsRunning(!isRunning);
  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(mode === 'study' ? 25 * 60 : 5 * 60);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
      >
        <Clock className={`w-3.5 h-3.5 ${isRunning ? 'text-green-600 animate-pulse' : 'text-slate-500'}`} />
        <span>{formattedTime}</span>
        <span className="hidden sm:inline-block text-[10px] text-slate-400 capitalize">({mode})</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
              <Zap className="w-3.5 h-3.5 mr-1 text-amber-500" /> Focus Pomodoro
            </h4>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="text-center py-2">
            <div className="text-3xl font-black text-slate-800 font-mono tracking-tight">{formattedTime}</div>
            <p className="text-[11px] text-slate-500 capitalize mt-0.5">{mode === 'study' ? '25-Min Study Sprint' : '5-Min Rest Break'}</p>
          </div>

          <div className="flex items-center justify-center space-x-2 mt-3">
            <button
              onClick={toggleTimer}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold text-white flex items-center shadow-sm ${isRunning ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {isRunning ? <><Pause className="w-3.5 h-3.5 mr-1" /> Pause</> : <><Play className="w-3.5 h-3.5 mr-1" /> Start</>}
            </button>
            <button
              onClick={resetTimer}
              className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl"
              title="Reset Timer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const Onboarding = ({ onComplete }) => {
  const [formData, setFormData] = useState({
    name: '',
    college: '',
    customCollege: '',
    branch: '',
    customBranch: '',
    year: '1st Year',
    semester: 'Sem 1'
  });
  const [isCustomCollege, setIsCustomCollege] = useState(false);
  const [isCustomBranch, setIsCustomBranch] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCollegeChange = (e) => {
    const val = e.target.value;
    if (val === 'Other (Type Custom University)') {
      setIsCustomCollege(true);
      setFormData({ ...formData, college: '' });
    } else {
      setIsCustomCollege(false);
      setFormData({ ...formData, college: val, customCollege: '' });
    }
  };

  const handleBranchChange = (e) => {
    const val = e.target.value;
    if (val === 'Other (Type Custom Branch)') {
      setIsCustomBranch(true);
      setFormData({ ...formData, branch: '' });
    } else {
      setIsCustomBranch(false);
      setFormData({ ...formData, branch: val, customBranch: '' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalCollege = isCustomCollege ? formData.customCollege.trim() : formData.college;
    const finalBranch = isCustomBranch ? formData.customBranch.trim() : formData.branch;

    if (!formData.name.trim() || !finalCollege || !finalBranch || !formData.year || !formData.semester) {
      setError('Please fill in all profile details');
      return;
    }

    setLoading(true);
    setError('');

    const userProfileData = {
      name: formData.name.trim(),
      college: finalCollege,
      branch: finalBranch,
      year: formData.year,
      semester: formData.semester,
      role: 'student'
    };

    try {
      const userId = auth.currentUser ? auth.currentUser.uid : 'demo-user';
      const userRef = doc(db, 'artifacts', appId, 'users', userId, 'profile', 'data');
      await setDoc(userRef, { ...userProfileData, updatedAt: serverTimestamp() });

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: formData.name });
      }
    } catch (err) {
      console.warn("Profile setup notice:", err?.message);
    }

    setLoading(false);
    onComplete(userProfileData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 border border-slate-100">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 text-blue-600 rounded-xl mb-3 font-bold text-xl shadow-inner">
            S-OS
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Set Up Your Student Profile</h1>
          <p className="text-slate-500 text-sm mt-1">Customize your StudentOS AI study workspace</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl flex items-center text-xs font-medium border border-red-100">
            <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Your Full Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g. Rahul Sharma"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">University / College</label>
            {!isCustomCollege ? (
              <select
                onChange={handleCollegeChange}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                <option value="">-- Select Your College / University --</option>
                {PRESET_UNIVERSITIES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            ) : (
              <input
                type="text"
                required
                value={formData.customCollege}
                onChange={(e) => setFormData({ ...formData, customCollege: e.target.value })}
                className="w-full px-4 py-2.5 border border-blue-300 bg-blue-50/30 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Type your University Name"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Branch / Course</label>
            {!isCustomBranch ? (
              <select
                onChange={handleBranchChange}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                <option value="">-- Select Branch --</option>
                {PRESET_BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            ) : (
              <input
                type="text"
                required
                value={formData.customBranch}
                onChange={(e) => setFormData({ ...formData, customBranch: e.target.value })}
                className="w-full px-4 py-2.5 border border-blue-300 bg-blue-50/30 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="e.g. BCA, B.Sc Data Science"
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Academic Year</label>
              <select
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Semester</label>
              <select
                value={formData.semester}
                onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 mt-6 flex items-center justify-center"
          >
            {loading ? 'Setting up Workspace...' : 'Enter StudentOS'} <ChevronRight className="w-5 h-5 ml-1" />
          </button>
        </form>
      </div>
    </div>
  );
};

const AddSubjectModal = ({ isOpen, onClose, onAddSubject, userProfile }) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [semester, setSemester] = useState(userProfile?.semester || 'Sem 1');
  const [branch, setBranch] = useState(userProfile?.branch || 'General');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddSubject({
        name: name.trim(),
        code: code.trim().toUpperCase() || 'SUB-' + Math.floor(100 + Math.random() * 900),
        semester: semester,
        branch: branch,
        college: userProfile?.college || 'General'
      });
      setName('');
      setCode('');
      onClose();
    } catch (err) {
      console.warn("Failed to add subject:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Plus className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Add New Subject</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Subject Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Distributed Operating Systems"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Subject Code (Optional)</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. CS602"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Semester</label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Branch</label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="Branch"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-5 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 shadow-sm">
              {isSubmitting ? 'Saving...' : 'Add Subject'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AddNoteModal = ({ isOpen, onClose, subjects, defaultSubjectId, onAddNote, onOpenAddSubject }) => {
  const [subjectId, setSubjectId] = useState(defaultSubjectId || '');
  const [title, setTitle] = useState('');
  const [unit, setUnit] = useState('Unit 1');
  const [type, setType] = useState('Lecture Notes');
  const [content, setContent] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (defaultSubjectId) {
      setSubjectId(defaultSubjectId);
    } else if (subjects.length > 0) {
      setSubjectId(prev => {
        if (prev && subjects.find(s => s.id === prev)) return prev;
        return subjects[0].id;
      });
    }
  }, [defaultSubjectId, subjects]);

  if (!isOpen) return null;

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadedFileName(file.name);
    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, ""));
    }

    e.target.value = '';
    setMessage(`Reading ${file.name}...`);
    extractFileText(file, (t) => setContent(t))
      .then((text) => {
        if (!text.trim()) throw new Error('No text found in this file.');
        setContent(text);
        setMessage(`Successfully loaded file: ${file.name}`);
      })
      .catch((err) => setMessage(err?.message || 'Error reading file. Please paste text directly.'));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !subjectId) {
      setMessage('Please select a subject, title, and enter or upload notes content.');
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    const selectedSubObj = subjects.find(s => s.id === subjectId);
    const noteData = {
      subjectId,
      subjectName: selectedSubObj ? String(selectedSubObj.name || 'General') : 'General',
      title: title.trim(),
      unit,
      type,
      fileName: uploadedFileName || null,
      content: content.trim()
    };

    try {
      await onAddNote(noteData);
      setMessage('Notes uploaded successfully! Curriculum and AI Tutor will analyze this.');
      setTimeout(() => {
        setTitle('');
        setContent('');
        setUploadedFileName('');
        setMessage('');
        onClose();
      }, 1000);
    } catch (err) {
      console.warn("Note submit error:", err);
      setMessage('Failed to save notes.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] flex flex-col border border-slate-100">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <FileUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Upload Study Notes</h3>
              <p className="text-[11px] text-slate-500">StudentOS will extract topics & units from this to build your curriculum.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {message && (
          <div className={`mt-3 p-2.5 rounded-xl text-xs font-medium flex items-center ${message.includes('successfully') || message.includes('loaded') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            {message.includes('successfully') || message.includes('loaded') ? <Check className="w-4 h-4 mr-2 flex-shrink-0"/> : <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0"/>}
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-3 overflow-y-auto flex-1 pr-1 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-slate-600">Select Subject *</label>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAddSubject();
                  }}
                  className="text-[11px] text-blue-600 hover:underline font-medium flex items-center"
                >
                  <Plus className="w-3 h-3 mr-0.5" /> Add New Subject
                </button>
              </div>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                <option value="" disabled>-- Select Subject --</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{String(s.name || '')} ({String(s.code || 'SUB')})</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Document Category</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                <option value="Lecture Notes">Lecture Notes / Class Handout</option>
                <option value="Syllabus">Syllabus / Curriculum</option>
                <option value="PYQs (Previous Papers)">Previous Year Questions (PYQs)</option>
                <option value="Formula Sheet">Formulas / Key Summary</option>
                <option value="Practical Manual">Practical / Lab Manual</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Chapter / Topic Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Process Synchronization & Semaphores"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Unit Tag (Important)</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                <option value="Unit 1">Unit 1</option>
                <option value="Unit 2">Unit 2</option>
                <option value="Unit 3">Unit 3</option>
                <option value="Unit 4">Unit 4</option>
                <option value="Unit 5">Unit 5</option>
                <option value="Unit 6">Unit 6</option>
                <option value="Full Module">Full Module</option>
              </select>
            </div>
          </div>

          <div className="p-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/70 text-center space-y-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept={NOTE_FILE_ACCEPT}
            />
            <Upload className="w-6 h-6 text-blue-600 mx-auto" />
            <p className="text-xs font-medium text-slate-700">
              {uploadedFileName ? `Attached File: ${uploadedFileName}` : 'Upload PDF, Word, PowerPoint, Excel, image or text notes'}
            </p>
            <div className="flex justify-center space-x-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
              >
                Browse File (PDF, Word, PPT, Excel, image, text)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Notes Content / Text Details (AI uses this) *</label>
            <textarea
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste or type lecture text, formulas, definitions, questions, or notes content here..."
              className="w-full p-3 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none resize-none font-mono"
              required
            />
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-5 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 shadow-sm flex items-center">
              {isSubmitting ? 'Saving Notes...' : 'Save Notes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AskAI = ({ userProfile, subjects, allNotes, onSaveAnswer, externalQuestion = '' }) => {
  const [question, setQuestion] = useState('');
  const [selectedSubject, setSelectedSubject] = useState(subjects[0]?.id || '');
  const [mode, setMode] = useState('5 Marks');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState(null);
  const [showNotification, setShowNotification] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (externalQuestion) {
      setQuestion(externalQuestion);
    }
  }, [externalQuestion]);

  useEffect(() => {
    if (subjects.length > 0 && !selectedSubject) {
      setSelectedSubject(subjects[0].id);
    }
  }, [subjects, selectedSubject]);

  const MODES = ['3 Marks', '5 Marks', '10 Marks', 'Viva Answer', 'Quick Revision', 'Detailed Explanation'];

  const [history, setHistory] = useState([]);
  const abortRef = useRef(null);

  const handleAsk = async () => {
    if (!question.trim()) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setAnswer(null);
    const activeSubObj = subjects.find(s => s.id === selectedSubject);
    const matchedNotes = allNotes.filter(n => {
      if (!selectedSubject) return true;
      if (n.subjectId === selectedSubject) return true;
      return !!(activeSubObj && typeof n.subjectName === 'string' && typeof activeSubObj.name === 'string' && n.subjectName.toLowerCase() === activeSubObj.name.toLowerCase());
    });
    const grounded = matchedNotes.length > 0;
    try {
      const text = await streamAI({
        task: 'answer', question, mode, notes: matchedNotes,
        subject: activeSubObj?.name || '', profile: userProfile || {}, history,
      }, (t) => setAnswer({ text: t, grounded, streaming: true }), ctrl.signal);
      setAnswer({ text, grounded, timestamp: new Date() });
      setHistory(h => [...h, { question, answer: text }].slice(-3));
    } catch (error) {
      if (error?.name === 'AbortError') return;
      setAnswer({ text: `**Couldn't get an answer:** ${error?.message || 'Please try again.'}`, error: true });
    } finally {
      if (abortRef.current === ctrl) setLoading(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { setShowNotification('Image too large (max 8MB)'); setTimeout(() => setShowNotification(''), 3000); return; }
    setShowNotification('Reading your photo...');
    try {
      const image = await fileToDataUrl(file);
      const text = await streamAI({ task: 'scan', image }, (t) => setQuestion(t));
      setQuestion(text.trim());
      setShowNotification('Question extracted from photo!');
    } catch (err) {
      setShowNotification(err?.message || 'Could not read that image');
    }
    setTimeout(() => setShowNotification(''), 3000);
  };

  const handleSave = () => {
    if (answer && !answer.error && typeof answer.text === 'string') {
      const subjectObj = subjects.find(s => s.id === selectedSubject);
      const subjectName = subjectObj && typeof subjectObj.name === 'string' ? subjectObj.name : 'General';
      onSaveAnswer({ question, answer: answer.text, mode, subject: subjectName });
      setShowNotification("Answer saved to your bookmarks!");
      setTimeout(() => setShowNotification(''), 3000);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-800 flex items-center">
          <BrainCircuit className="w-6 h-6 mr-2 text-blue-600" /> Ask StudentOS AI Tutor
        </h2>
        {showNotification && (
          <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium animate-pulse">
            {showNotification}
          </span>
        )}
      </div>

      <div className="space-y-4">
        <div className="relative">
          <textarea
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 pr-12 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none resize-none min-h-[110px] text-sm"
            placeholder="Ask any exam question or topic... (AI will read your uploaded notes first)"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <div className="absolute top-3 right-3 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-slate-500 hover:text-blue-600 bg-white rounded-xl shadow-2xs border border-slate-200"
              title="Upload Question Photo"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-500 uppercase">Subject:</span>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-blue-500"
            >
              <option value="">All Uploaded Notes</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{String(s.name || '')}</option>)}
            </select>
          </div>

          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl overflow-x-auto max-w-full custom-scrollbar">
            {MODES.map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all ${
                  mode === m ? 'bg-white shadow-xs text-blue-600 font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleAsk}
          disabled={loading || !question.trim()}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center shadow-md shadow-blue-500/10"
        >
          {loading ? (
            <span className="flex items-center">
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Synthesizing Academic Answer...
            </span>
          ) : (
            <span className="flex items-center">
              <Sparkles className="w-4 h-4 mr-2" /> Generate Academic Answer
            </span>
          )}
        </button>

        {answer && (
          <div className="mt-6 border-t border-slate-100 pt-6">
            <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200/80 relative">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div className="inline-flex items-center text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-lg font-medium">
                  <Sparkles className="w-3.5 h-3.5 mr-1 text-blue-600" />
                  {answer.grounded ? 'Synthesized from Uploaded Notes & Expert Academic Knowledge' : 'Comprehensive Academic Answer'}
                </div>
                <span className="text-xs font-bold bg-slate-200 text-slate-700 px-2.5 py-0.5 rounded-md">
                  {mode}
                </span>
              </div>

              <FormattedAIAnswer text={answer.text} />

              {!answer.error && (
                <div className="mt-5 pt-4 border-t border-slate-200/60 flex flex-wrap gap-2 justify-end">
                  <button
                    onClick={() => {
                      if (typeof answer.text === 'string') {
                        navigator.clipboard.writeText(answer.text);
                        setShowNotification("Copied to clipboard!");
                        setTimeout(() => setShowNotification(''), 3000);
                      }
                    }}
                    className="text-xs font-medium flex items-center text-slate-600 hover:text-blue-600 px-3 py-1.5 bg-white rounded-lg border border-slate-200 shadow-2xs"
                  >
                    <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy Text
                  </button>
                  <button
                    onClick={handleSave}
                    className="text-xs font-medium flex items-center text-slate-600 hover:text-blue-600 px-3 py-1.5 bg-white rounded-lg border border-slate-200 shadow-2xs"
                  >
                    <Bookmark className="w-3.5 h-3.5 mr-1.5" /> Bookmark Answer
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const FlashcardWidget = () => {
  const [cards] = useState(SAMPLE_FLASHCARDS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const currentCard = cards[currentIndex];

  const nextCard = () => {
    setFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % cards.length);
  };

  const prevCard = () => {
    setFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-800 text-base flex items-center">
          <Lightbulb className="w-5 h-5 mr-2 text-amber-500" /> Quick Recall Flashcards
        </h3>
        <span className="text-xs text-slate-400 font-semibold">
          Card {currentIndex + 1} of {cards.length}
        </span>
      </div>

      <div
        onClick={() => setFlipped(!flipped)}
        className={`min-h-[150px] p-6 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between select-none ${
          flipped
            ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-blue-600 shadow-md'
            : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
        }`}
      >
        <span className="text-[10px] uppercase font-bold tracking-wider opacity-75">
          {flipped ? 'Answer' : 'Question (Click to Flip)'}
        </span>
        <div className="my-auto py-2">
          <p className={`font-semibold text-sm sm:text-base leading-relaxed ${flipped ? 'text-white' : 'text-slate-800'}`}>
            {flipped ? currentCard.answer : currentCard.question}
          </p>
        </div>
        <div className="text-right text-[11px] font-medium opacity-80">
          {flipped ? 'Click to flip back' : 'Tap to reveal answer →'}
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          onClick={prevCard}
          className="text-xs font-semibold text-slate-600 px-3 py-1.5 border border-slate-200 rounded-xl hover:bg-slate-50"
        >
          ← Previous
        </button>
        <button
          onClick={nextCard}
          className="text-xs font-semibold text-blue-600 px-4 py-1.5 bg-blue-50 rounded-xl hover:bg-blue-100"
        >
          Next Card →
        </button>
      </div>
    </div>
  );
};

const SubjectHub = ({ subject, notes, onClose, onOpenAddNote, onAskQuestion, onDeleteNote, onUpdateSubject }) => {
  const [activeTab, setActiveTab] = useState('curriculum');
  const [selectedNote, setSelectedNote] = useState(null);
  const [isGeneratingSyllabus, setIsGeneratingSyllabus] = useState(false);

  const subjectNotes = notes.filter(n => 
    n.subjectId === subject.id || 
    (typeof n.subjectName === 'string' && typeof subject.name === 'string' && n.subjectName.toLowerCase() === subject.name.toLowerCase())
  );

  const handleGenerateSyllabus = async () => {
    setIsGeneratingSyllabus(true);
    const res = await generateAICurriculum(subjectNotes, subject.name, (t) => onUpdateSubject(subject.id, { curriculum: t }));
    if (res.text) {
      await onUpdateSubject(subject.id, { curriculum: res.text });
    } else if (res.error) {
      alert(res.error);
    }
    setIsGeneratingSyllabus(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full h-[85vh] flex flex-col border border-slate-100">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-2xl">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">{String(subject.name || '')}</h2>
              <p className="text-xs text-slate-500 uppercase font-semibold">{String(subject.code || subject.id || '')} • {String(subject.semester || '')}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-slate-200 px-6 pt-3 space-x-6 bg-white">
          {['curriculum', 'notes', 'flashcards'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 font-medium text-xs uppercase tracking-wider transition-all ${
                activeTab === tab ? 'border-b-2 border-blue-600 text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab === 'notes' ? `Uploaded Notes (${subjectNotes.length})` : tab === 'curriculum' ? 'Dynamic Curriculum' : tab}
            </button>
          ))}
        </div>

        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
          {activeTab === 'curriculum' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                <div>
                  <h3 className="font-bold text-blue-900 text-sm flex items-center">
                    <List className="w-4 h-4 mr-1.5" /> Dynamic Syllabus
                  </h3>
                  <p className="text-[11px] text-blue-700 mt-0.5">Built automatically from your uploaded notes grouped by units.</p>
                </div>
                <button
                  onClick={handleGenerateSyllabus}
                  disabled={isGeneratingSyllabus || subjectNotes.length === 0}
                  className="px-4 py-2.5 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center shadow-sm"
                >
                  {isGeneratingSyllabus ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
                  {subject.curriculum ? 'Regenerate Curriculum' : 'Analyze Notes & Build'}
                </button>
              </div>

              {subject.curriculum ? (
                <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
                  <FormattedAIAnswer text={subject.curriculum} />
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                  <BrainCircuit className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-600">No Curriculum Generated</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    {subjectNotes.length === 0 
                      ? "Upload study notes for this subject first. Then, StudentOS will analyze them and build a structured syllabus organized by Units for you." 
                      : "You have uploaded notes! Click 'Analyze Notes & Build' to automatically create your structured syllabus based on the units you provided."}
                  </p>
                  {subjectNotes.length === 0 && (
                     <button
                       onClick={() => onOpenAddNote(subject.id)}
                       className="mt-4 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-xl text-xs font-semibold hover:bg-slate-50 flex items-center mx-auto"
                     >
                       <Plus className="w-3.5 h-3.5 mr-1" /> Upload First Note
                     </button>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">Your notes and materials for this subject</p>
                <button
                  onClick={() => onOpenAddNote(subject.id)}
                  className="bg-blue-600 text-white px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-blue-700 flex items-center shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Upload Note
                </button>
              </div>

              {subjectNotes.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                  <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-600">No notes uploaded for this subject yet.</p>
                  <p className="text-xs text-slate-400 mt-1">Click 'Upload Note' to paste text or upload files for AI ground search.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {subjectNotes.map(note => (
                    <div
                      key={note.id}
                      className="p-4 bg-white border border-slate-200 rounded-2xl hover:border-blue-300 hover:shadow-md transition-all space-y-2 group relative"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          {String(note.unit || 'Unit 1')}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteNote(note.id);
                          }}
                          className="text-slate-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50"
                          title="Delete Note"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <h4 className="font-semibold text-slate-800 text-sm">{String(note.title || '')}</h4>
                      <p className="text-xs text-slate-500 line-clamp-2">{String(note.content || '')}</p>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <button
                          onClick={() => setSelectedNote(note)}
                          className="text-[11px] text-blue-600 font-semibold flex items-center hover:underline"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" /> Read Note
                        </button>
                        <button
                          onClick={() => {
                            onClose();
                            onAskQuestion(`Explain key concepts from note: ${note.title}`);
                          }}
                          className="text-[11px] text-indigo-600 font-semibold flex items-center hover:underline"
                        >
                          <Sparkles className="w-3.5 h-3.5 mr-1" /> Ask AI
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'flashcards' && (
            <div className="space-y-4">
              <FlashcardWidget />
            </div>
          )}
        </div>

        {selectedNote && (
          <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6 max-h-[80vh] flex flex-col space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded">{String(selectedNote.unit || '')}</span>
                  <h3 className="text-base font-bold text-slate-800 mt-1">{String(selectedNote.title || '')}</h3>
                </div>
                <button onClick={() => setSelectedNote(null)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-3 bg-slate-50 rounded-xl font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                {String(selectedNote.content || '')}
              </div>
              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={() => {
                    const noteText = selectedNote.title;
                    setSelectedNote(null);
                    onClose();
                    if (onAskQuestion) onAskQuestion(`Explain key exam concepts from: ${noteText}`);
                  }}
                  className="text-xs bg-blue-600 text-white font-semibold px-4 py-2 rounded-xl hover:bg-blue-700 flex items-center"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Ask AI Tutor About This Note
                </button>
                <button onClick={() => setSelectedNote(null)} className="text-xs text-slate-500 font-medium hover:text-slate-800">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const AdminDashboard = ({ globalSubjects, allNotes, userProfile, onAddSubject, onDeleteSubject, onDeleteNote }) => {
  const [activeTab, setActiveTab] = useState('subjects');

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Academic Management</h1>
          <p className="text-slate-500 text-sm">Overview of subjects and notes stored across your workspace</p>
        </div>
      </div>

      <div className="flex border-b border-slate-200 space-x-6">
        <button
          onClick={() => setActiveTab('subjects')}
          className={`pb-3 font-medium text-sm transition-all ${activeTab === 'subjects' ? 'border-b-2 border-blue-600 text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-800'}`}
        >
          All Subjects ({globalSubjects.length})
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`pb-3 font-medium text-sm transition-all ${activeTab === 'notes' ? 'border-b-2 border-blue-600 text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-800'}`}
        >
          All Uploaded Notes ({allNotes.length})
        </button>
      </div>

      {activeTab === 'subjects' && (
        <div className="bg-white p-6 rounded-2xl shadow-2xs border border-slate-100">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Subjects List</h2>
          <div className="space-y-3">
            {globalSubjects.map(sub => (
              <div key={sub.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl bg-slate-50/50">
                <div>
                  <h4 className="font-semibold text-slate-800 text-sm">
                    {String(sub.name || '')} <span className="text-xs text-blue-600 ml-2">({String(sub.code || '')})</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">{String(sub.semester || '')} • {String(sub.branch || 'General')}</p>
                </div>
                <button
                  onClick={() => onDeleteSubject(sub.id)}
                  className="text-xs text-red-600 hover:text-red-700 font-medium px-3 py-1.5 border border-red-200 rounded-lg bg-red-50 flex items-center"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'notes' && (
        <div className="bg-white p-6 rounded-2xl shadow-2xs border border-slate-100 space-y-3">
          {allNotes.map(note => (
            <div key={note.id} className="p-4 border border-slate-100 rounded-xl bg-slate-50/50 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                  {String(note.unit || '')}
                </span>
                <h4 className="font-semibold text-slate-800 text-sm mt-1">{String(note.title || '')}</h4>
                <p className="text-xs text-slate-500 line-clamp-1">{String(note.content || '')}</p>
              </div>
              <button
                onClick={() => onDeleteNote(note.id)}
                className="text-xs text-red-600 hover:text-red-700 font-medium px-3 py-1.5 border border-red-200 rounded-lg bg-red-50 flex items-center"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const App = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [globalSearch, setGlobalSearch] = useState('');
  const [askAIQuestion, setAskAIQuestion] = useState('');

  const [dbSubjects, setDbSubjects] = useState([]);
  const [localSubjects, setLocalSubjects] = useState([]);
  
  const [dbNotes, setDbNotes] = useState([]);
  const [localNotes, setLocalNotes] = useState([]);
  
  const [dbSavedAnswers, setDbSavedAnswers] = useState([]);
  const [localSavedAnswers, setLocalSavedAnswers] = useState([]);

  const [selectedSubjectHub, setSelectedSubjectHub] = useState(null);
  const [isAddNoteModalOpen, setIsAddNoteModalOpen] = useState(false);
  const [isAddSubjectModalOpen, setIsAddSubjectModalOpen] = useState(false);
  const [addNoteDefaultSubId, setAddNoteDefaultSubId] = useState('');

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (false) {
          await signInWithCustomToken(auth, '');
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.warn("Auth initialize notice:", error);
      }
    };
    initializeAuth();

    let unsubscribeSaved = null;
    let unsubscribeSubjects = null;
    let unsubscribeNotes = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currUser) => {
      setUser(currUser);
      if (currUser) {
        try {
          const profileRef = doc(db, 'artifacts', appId, 'users', currUser.uid, 'profile', 'data');
          const docSnap = await getDoc(profileRef);
          if (docSnap.exists()) {
            setProfile(docSnap.data());
          }
        } catch (err) {
          console.warn("User profile fetch notice:", err);
        }

        const savedRef = collection(db, 'artifacts', appId, 'users', currUser.uid, 'saved_answers');
        unsubscribeSaved = onSnapshot(savedRef, (snapshot) => {
          const answers = [];
          snapshot.forEach((doc) => answers.push({ id: doc.id, ...doc.data() }));
          setDbSavedAnswers(answers);
        }, (error) => {
          console.warn("Saved answers snapshot notice:", error?.message);
        });

        const subjectsRef = collection(db, 'artifacts', appId, 'subjects');
        unsubscribeSubjects = onSnapshot(subjectsRef, (snapshot) => {
          const subs = [];
          snapshot.forEach((doc) => subs.push({ id: doc.id, ...doc.data() }));
          setDbSubjects(subs);
        }, (error) => {
          console.warn("Subjects snapshot notice:", error?.message);
        });

        const notesRef = collection(db, 'artifacts', appId, 'notes');
        unsubscribeNotes = onSnapshot(notesRef, (snapshot) => {
          const notesArr = [];
          snapshot.forEach((doc) => notesArr.push({ id: doc.id, ...doc.data() }));
          setDbNotes(notesArr);
        }, (error) => {
          console.warn("Notes snapshot notice:", error?.message);
        });

        setLoading(false);
      } else {
        if (unsubscribeSaved) unsubscribeSaved();
        if (unsubscribeSubjects) unsubscribeSubjects();
        if (unsubscribeNotes) unsubscribeNotes();
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSaved) unsubscribeSaved();
      if (unsubscribeSubjects) unsubscribeSubjects();
      if (unsubscribeNotes) unsubscribeNotes();
    };
  }, []);

  const globalSubjects = useMemo(() => {
    const map = new Map();
    dbSubjects.forEach(s => map.set(s.id, s));
    localSubjects.forEach(s => map.set(s.id, s));
    return Array.from(map.values());
  }, [dbSubjects, localSubjects]);

  const allNotes = useMemo(() => {
    const map = new Map();
    dbNotes.forEach(n => map.set(n.id, n));
    localNotes.forEach(n => map.set(n.id, n));
    return Array.from(map.values());
  }, [dbNotes, localNotes]);

  const savedAnswers = useMemo(() => {
    const map = new Map();
    dbSavedAnswers.forEach(a => map.set(a.id, a));
    localSavedAnswers.forEach(a => map.set(a.id, a));
    const list = Array.from(map.values());
    list.sort((a, b) => (b.savedAt?.seconds || 0) - (a.savedAt?.seconds || 0));
    return list;
  }, [dbSavedAnswers, localSavedAnswers]);

  const handleAddSubject = async (subData) => {
    const newSubObj = {
      name: subData.name,
      code: subData.code,
      semester: subData.semester,
      branch: subData.branch || profile?.branch || 'General',
      college: subData.college || profile?.college || 'General',
      curriculum: ''
    };

    try {
      const docRef = await addDoc(collection(db, 'artifacts', appId, 'subjects'), {
        ...newSubObj,
        createdAt: serverTimestamp()
      });
      setLocalSubjects(prev => [...prev, { id: docRef.id, ...newSubObj }]);
    } catch (err) {
      console.warn("Firestore write fallback to local state:", err?.message);
      const localId = 'sub-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
      setLocalSubjects(prev => [...prev, { id: localId, ...newSubObj }]);
    }
  };

  const handleUpdateSubject = async (id, updatedFields) => {
    setLocalSubjects(prev => prev.map(s => s.id === id ? { ...s, ...updatedFields } : s));
    setDbSubjects(prev => prev.map(s => s.id === id ? { ...s, ...updatedFields } : s));
    try {
      const docRef = doc(db, 'artifacts', appId, 'subjects', id);
      await updateDoc(docRef, updatedFields);
    } catch (err) {
      console.warn("Firestore update fallback to local state:", err?.message);
    }
  };

  const handleDeleteSubject = async (id) => {
    setLocalSubjects(prev => prev.filter(s => s.id !== id));
    setDbSubjects(prev => prev.filter(s => s.id !== id));
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'subjects', id));
    } catch (err) {
      console.warn("Firestore delete fallback to local state:", err?.message);
    }
  };

  const handleAddNote = async (noteData) => {
    try {
      const docRef = await addDoc(collection(db, 'artifacts', appId, 'notes'), {
        ...noteData,
        createdAt: serverTimestamp()
      });
      setLocalNotes(prev => [...prev, { id: docRef.id, ...noteData }]);
    } catch (err) {
      console.warn("Firestore note add fallback to local state:", err?.message);
      const localId = 'note-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
      setLocalNotes(prev => [...prev, { id: localId, ...noteData }]);
    }
  };

  const handleDeleteNote = async (id) => {
    setLocalNotes(prev => prev.filter(n => n.id !== id));
    setDbNotes(prev => prev.filter(n => n.id !== id));
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'notes', id));
    } catch (err) {
      console.warn("Firestore note delete fallback to local state:", err?.message);
    }
  };

  const handleSaveAnswer = async (answerData) => {
    const localItem = { ...answerData, id: 'saved-' + Date.now(), savedAt: { seconds: Math.floor(Date.now() / 1000) } };
    try {
      if (user?.uid) {
        const savedRef = collection(db, 'artifacts', appId, 'users', user.uid, 'saved_answers');
        const docRef = await addDoc(savedRef, { ...answerData, savedAt: serverTimestamp() });
        setLocalSavedAnswers(prev => [...prev, { id: docRef.id, ...answerData }]);
      } else {
        setLocalSavedAnswers(prev => [...prev, localItem]);
      }
    } catch (err) {
      console.warn("Firestore answer save fallback to local state:", err?.message);
      setLocalSavedAnswers(prev => [...prev, localItem]);
    }
  };

  const handleOpenAddNote = (subId = '') => {
    setAddNoteDefaultSubId(subId);
    setIsAddNoteModalOpen(true);
  };

  const mySubjects = useMemo(() => {
    if (!profile) return globalSubjects;
    return globalSubjects;
  }, [globalSubjects, profile]);

  const filteredSubjects = useMemo(() => {
    if (!globalSearch.trim()) return mySubjects;
    const query = globalSearch.toLowerCase();
    return mySubjects.filter(s => 
      String(s.name || '').toLowerCase().includes(query) || 
      String(s.code || '').toLowerCase().includes(query)
    );
  }, [mySubjects, globalSearch]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
          <p className="text-xs font-semibold tracking-widest uppercase text-slate-400">Loading StudentOS Workspace...</p>
        </div>
      </div>
    );
  }

  if (user && !profile) {
    return <Onboarding onComplete={setProfile} />;
  }

  const NAV_ITEMS = [
    { id: 'home', icon: BookOpen, label: 'AI Tutor' },
    { id: 'subjects', icon: FolderOpen, label: 'My Subjects' },
    { id: 'saved', icon: BookMarked, label: 'Bookmarked Answers' },
    { id: 'profile', icon: User, label: 'Profile' },
    ...(profile?.role === 'admin' ? [{ id: 'admin', icon: Settings, label: 'Admin Panel' }] : [])
  ];

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col z-10 shadow-2xs">
        <div className="p-6">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 bg-blue-600 text-white font-black rounded-xl flex items-center justify-center text-base shadow-md shadow-blue-500/20">
              S
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Student<span className="text-blue-600">OS</span></h1>
          </div>
          <p className="text-xs text-slate-500 mt-2 truncate font-medium">{String(profile?.college || '')}</p>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {NAV_ITEMS.map(item => {
            const IconComponent = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
                  activeTab === item.id ? 'bg-blue-50 text-blue-700 shadow-2xs' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <IconComponent className={`w-5 h-5 mr-3 ${activeTab === item.id ? 'text-blue-600' : 'text-slate-400'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center mb-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs mr-2">
              {typeof profile?.name === 'string' && profile.name ? profile.name.charAt(0) : 'S'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-bold text-slate-800 truncate">{String(profile?.name || '')}</p>
              <p className="text-[10px] text-slate-500 truncate">{String(profile?.branch || '')}</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white border-b border-slate-200 p-4 flex items-center justify-between z-10">
          <div className="flex items-center flex-1">
            <div className="md:hidden mr-3 font-bold text-blue-600 text-lg flex items-center">
              <div className="w-7 h-7 bg-blue-600 text-white rounded-lg flex items-center justify-center mr-1.5 text-xs font-black">S</div>
              StudentOS
            </div>
            <div className="relative w-full max-w-md hidden sm:block">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search subjects or notes..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="w-full bg-slate-100 text-xs rounded-full pl-10 pr-4 py-2 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <PomodoroTimer />
            <button
              onClick={() => setIsAddSubjectModalOpen(true)}
              className="bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold px-3 py-2 rounded-xl flex items-center transition-all"
            >
              <Plus className="w-3.5 h-3.5 mr-1 text-slate-500" /> Add Subject
            </button>
            <button
              onClick={() => handleOpenAddNote()}
              className="bg-blue-600 text-white text-xs font-semibold px-3.5 py-2 rounded-xl hover:bg-blue-700 flex items-center shadow-2xs"
            >
              <FileUp className="w-3.5 h-3.5 mr-1" /> Upload Notes
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar pb-24 md:pb-6 relative">
          {activeTab === 'home' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">
                    Welcome, {typeof profile?.name === 'string' ? profile.name.split(' ')[0] : 'Student'} 👋
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {String(profile?.college || '')} • {String(profile?.branch || '')} ({String(profile?.semester || '')})
                  </p>
                </div>
              </div>

              <AskAI
                userProfile={profile}
                subjects={mySubjects}
                allNotes={allNotes}
                onSaveAnswer={handleSaveAnswer}
                externalQuestion={askAIQuestion}
              />

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-slate-800">
                    My Enrolled Subjects ({mySubjects.length})
                  </h3>
                  <button onClick={() => setIsAddSubjectModalOpen(true)} className="text-xs text-blue-600 font-semibold hover:underline flex items-center">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add New Subject
                  </button>
                </div>

                {filteredSubjects.length === 0 ? (
                  <div className="bg-white p-8 rounded-2xl text-center border border-slate-200 space-y-3">
                    <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
                    <p className="text-sm font-semibold text-slate-700">No subjects added yet</p>
                    <p className="text-xs text-slate-400">Click below to add your first subject and start uploading notes!</p>
                    <button
                      onClick={() => setIsAddSubjectModalOpen(true)}
                      className="bg-blue-600 text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-blue-700"
                    >
                      + Add Subject
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {filteredSubjects.map(sub => {
                      const noteCount = allNotes.filter(n => 
                        n.subjectId === sub.id || 
                        (typeof n.subjectName === 'string' && typeof sub.name === 'string' && n.subjectName.toLowerCase() === sub.name.toLowerCase())
                      ).length;
                      return (
                        <div
                          key={sub.id}
                          onClick={() => setSelectedSubjectHub(sub)}
                          className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-md cursor-pointer transition-all group"
                        >
                          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <BookOpen className="w-5 h-5" />
                          </div>
                          <h4 className="font-bold text-slate-800 text-sm line-clamp-1 group-hover:text-blue-600 transition-colors">{String(sub.name || '')}</h4>
                          <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 text-[11px]">
                            <span className="text-slate-400 font-bold uppercase">{String(sub.code || 'SUB')}</span>
                            <span className="text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-md">{noteCount} Notes</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'subjects' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">My Subjects</h2>
                  <p className="text-xs text-slate-500">Manage subjects and view uploaded study materials</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setIsAddSubjectModalOpen(true)}
                    className="bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold px-3 py-2 rounded-xl flex items-center"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Subject
                  </button>
                  <button
                    onClick={() => handleOpenAddNote()}
                    className="bg-blue-600 text-white text-xs font-semibold px-3.5 py-2 rounded-xl hover:bg-blue-700 flex items-center shadow-2xs"
                  >
                    <FileUp className="w-3.5 h-3.5 mr-1" /> Upload Notes
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {mySubjects.map(sub => {
                  const noteCount = allNotes.filter(n => 
                    n.subjectId === sub.id || 
                    (typeof n.subjectName === 'string' && typeof sub.name === 'string' && n.subjectName.toLowerCase() === sub.name.toLowerCase())
                  ).length;
                  return (
                    <div key={sub.id} className="bg-white p-6 rounded-2xl shadow-2xs border border-slate-200/80 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold">
                            <BookOpen className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-base text-slate-800">{String(sub.name || '')}</h3>
                            <p className="text-xs text-slate-400 uppercase font-semibold">{String(sub.code || sub.id || '')}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteSubject(sub.id)}
                          className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50"
                          title="Delete Subject"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="pt-2 flex gap-2">
                        <button
                          onClick={() => setSelectedSubjectHub(sub)}
                          className="flex-1 py-2 px-3 bg-slate-50 rounded-xl text-slate-700 hover:bg-blue-50 hover:text-blue-700 text-xs font-semibold flex justify-center items-center transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5 mr-1.5" /> View {noteCount} Notes
                        </button>
                        <button
                          onClick={() => handleOpenAddNote(sub.id)}
                          className="py-2 px-3 bg-blue-600 text-white rounded-xl text-xs font-semibold flex justify-center items-center hover:bg-blue-700 transition-colors"
                        >
                          + Upload
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'saved' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <h2 className="text-2xl font-bold text-slate-800">Bookmarked AI Answers</h2>
              {savedAnswers.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
                  <BookMarked className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-700">No bookmarked answers yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {savedAnswers.map(ans => (
                    <div key={ans.id} className="bg-white p-5 rounded-2xl shadow-2xs border border-slate-200/80 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-700 rounded uppercase">
                          {String(ans.subject || 'General')}
                        </span>
                        <span className="text-xs font-semibold text-slate-400">{String(ans.mode || '')}</span>
                      </div>
                      <h3 className="font-bold text-slate-800 text-sm">{String(ans.question || '')}</h3>
                      <div className="prose prose-sm max-w-none text-slate-700 bg-slate-50 p-4 rounded-xl text-xs leading-relaxed">
                        <FormattedAIAnswer text={typeof ans.answer === 'string' ? ans.answer : String(ans.answer?.text || '')} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <h2 className="text-2xl font-bold text-slate-800">Academic Profile</h2>
              <div className="bg-white p-6 rounded-2xl shadow-2xs border border-slate-200 space-y-4">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Student Name</label>
                  <p className="font-bold text-lg text-slate-800">{String(profile?.name || '')}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">University / College</label>
                    <p className="font-semibold text-xs text-slate-700 mt-0.5">{String(profile?.college || '')}</p>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Branch</label>
                    <p className="font-semibold text-xs text-slate-700 mt-0.5">{String(profile?.branch || '')}</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-100">
                  <button
                    onClick={() => setProfile(null)}
                    className="text-xs text-blue-600 font-semibold hover:underline flex items-center"
                  >
                    <Edit3 className="w-3.5 h-3.5 mr-1" /> Re-configure Profile
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'admin' && profile?.role === 'admin' && (
            <AdminDashboard
              globalSubjects={globalSubjects}
              allNotes={allNotes}
              userProfile={profile}
              onAddSubject={handleAddSubject}
              onDeleteSubject={handleDeleteSubject}
              onDeleteNote={handleDeleteNote}
            />
          )}
        </div>
      </main>

      {selectedSubjectHub && (
        <SubjectHub
          subject={selectedSubjectHub}
          notes={allNotes}
          onClose={() => setSelectedSubjectHub(null)}
          onOpenAddNote={handleOpenAddNote}
          onAskQuestion={(qText) => {
            setAskAIQuestion(qText);
            setActiveTab('home');
          }}
          onDeleteNote={handleDeleteNote}
          onUpdateSubject={handleUpdateSubject}
        />
      )}

      <AddSubjectModal
        isOpen={isAddSubjectModalOpen}
        onClose={() => setIsAddSubjectModalOpen(false)}
        onAddSubject={handleAddSubject}
        userProfile={profile}
      />

      <AddNoteModal
        isOpen={isAddNoteModalOpen}
        onClose={() => setIsAddNoteModalOpen(false)}
        subjects={mySubjects.length > 0 ? mySubjects : globalSubjects}
        defaultSubjectId={addNoteDefaultSubId}
        onAddNote={handleAddNote}
        onOpenAddSubject={() => setIsAddSubjectModalOpen(true)}
      />
    </div>
  );
};

export default App;