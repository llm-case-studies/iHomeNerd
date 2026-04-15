// In dev: Vite proxy forwards /health, /capabilities, /v1/* to localhost:17777
// In prod: FastAPI serves both static files and API on the same origin
const BASE_URL = '';

export const api = {
  /**
   * GET /health
   * Returns overall system status.
   */
  async getHealth() {
    try {
      const res = await fetch(`${BASE_URL}/health`);
      if (!res.ok) throw new Error('Network response was not ok');
      return await res.json();
    } catch (e) {
      console.warn('Backend unavailable, using mock health data', e);
      return {
        ok: true,
        status: "ok",
        product: "iHomeNerd",
        version: "0.1.0",
        hostname: "local-mock",
        ollama: true,
        tts: true,
        asr: true,
        providers: ["gemma_local"],
        models: {
          chat: "gemma4:e2b",
          translate_text: "gemma4:e2b",
          transcribe_audio: "whisper-small-int8",
          synthesize_speech: "kokoro-82m-onnx"
        },
        binding: "0.0.0.0",
        port: 17777,
        uptime: 3600
      };
    }
  },

  /**
   * GET /capabilities
   * Flat boolean capability map plus full detail.
   */
  async getCapabilities() {
    try {
      const res = await fetch(`${BASE_URL}/capabilities`);
      if (!res.ok) throw new Error('Network response was not ok');
      return await res.json();
    } catch (e) {
      console.warn('Backend unavailable, using mock capabilities data', e);
      return {
        chat: true,
        translate_text: true,
        transcribe_audio: true,
        synthesize_speech: true,
        investigate_network: false,
        dialogue_agent: true,
        query_documents: false,
        _detail: {
          product: "iHomeNerd",
          version: "0.1.0",
          capabilities: {
            chat: { available: true, model: "gemma4:e2b", tier: "medium", core: true },
            translate_text: { available: true, model: "gemma4:e2b", tier: "light", core: true },
            transcribe_audio: { available: true, model: "whisper-small-int8", tier: "transcription" },
            synthesize_speech: { available: true, model: "kokoro-82m-onnx", tier: "tts", voices: 54 },
            investigate_network: { available: false, tier: "system", core: true },
            query_documents: { available: false, tier: "medium", core: true }
          }
        }
      };
    }
  },

  /**
   * POST /v1/chat
   * General-purpose chat.
   */
  async chat(messages: { role: string; content: string }[], model: string | null = null, language: string = 'en') {
    try {
      const res = await fetch(`${BASE_URL}/v1/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, model, language })
      });
      if (!res.ok) throw new Error('Network response was not ok');
      const data = await res.json();
      // Normalize: backend returns {response: "..."}, UI expects {role, content}
      return {
        role: 'assistant',
        content: data.response ?? data.content ?? JSON.stringify(data),
        model: data.model ?? 'gemma4:e2b',
      };
    } catch (e) {
      console.warn('Backend unavailable, using mock chat response', e);
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const lastMessage = messages[messages.length - 1]?.content || "";
      let reply = `This is a mocked local response. The backend at :17777 is not currently reachable. You said: "${lastMessage}"`;
      
      if (language === 'zh') {
        reply = `这是一个模拟的本地响应。目前无法访问 :17777 的后端。您说：“${lastMessage}”`;
      } else if (language === 'ko') {
        reply = `이것은 모의 로컬 응답입니다. 현재 :17777의 백엔드에 연결할 수 없습니다. 당신은 "${lastMessage}"라고 말했습니다.`;
      } else if (language === 'ja') {
        reply = `これはモックされたローカル応答です。現在、:17777 のバックエンドにアクセスできません。あなたは「${lastMessage}」と言いました。`;
      } else if (language === 'ru') {
        reply = `Это имитация локального ответа. В настоящее время бэкенд на :17777 недоступен. Вы сказали: «${lastMessage}»`;
      } else if (language === 'de') {
        reply = `Dies ist eine simulierte lokale Antwort. Das Backend unter :17777 ist derzeit nicht erreichbar. Sie sagten: "${lastMessage}"`;
      } else if (language === 'fr') {
        reply = `Ceci est une réponse locale simulée. Le backend à :17777 n'est actuellement pas joignable. Vous avez dit : "${lastMessage}"`;
      } else if (language === 'it') {
        reply = `Questa è una risposta locale simulata. Il backend a :17777 non è attualmente raggiungibile. Hai detto: "${lastMessage}"`;
      } else if (language === 'es') {
        reply = `Esta es una respuesta local simulada. Actualmente no se puede acceder al backend en :17777. Usted dijo: "${lastMessage}"`;
      } else if (language === 'pt') {
        reply = `Esta é uma resposta local simulada. O backend em :17777 não está acessível no momento. Você disse: "${lastMessage}"`;
      }

      return {
        role: "assistant",
        content: reply,
        model: "gemma4:e2b"
      };
    }
  },

  /**
   * POST /v1/translate
   * Text translation.
   */
  async translate(text: string, source: string, target: string) {
    try {
      const res = await fetch(`${BASE_URL}/v1/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, source, target })
      });
      if (!res.ok) throw new Error('Network response was not ok');
      const data = await res.json();
      // Normalize: backend returns {translation: "..."}, UI expects {translatedText}
      return {
        translatedText: data.translatedText ?? data.translation ?? '',
        detectedSource: data.detectedSource ?? data.source ?? source,
        target: data.target ?? target,
        model: data.model ?? 'gemma4:e2b',
      };
    } catch (e) {
      console.warn('Backend unavailable, using mock translate response', e);
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 600));
      return {
        translatedText: `[Mock Translation to ${target}]: ${text}`,
        detectedSource: source === 'auto' ? 'en' : source,
        target,
        model: "gemma4:e2b"
      };
    }
  },

  /**
   * POST /v1/transcribe-audio
   * Speech-to-text.
   */
  async transcribeAudio(audioBlob: Blob) {
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');
      const res = await fetch(`${BASE_URL}/v1/transcribe-audio`, {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error('Network response was not ok');
      return await res.json();
    } catch (e) {
      console.warn('Backend unavailable, using mock transcribe response', e);
      await new Promise(resolve => setTimeout(resolve, 1500));
      return {
        text: "This is a mock transcription. The local Whisper model is not reachable.",
        language: "en",
        model: "small"
      };
    }
  },

  /**
   * POST /v1/synthesize-speech
   * Text-to-speech.
   */
  async synthesizeSpeech(text: string, targetLang: string = 'en-US') {
    try {
      const res = await fetch(`${BASE_URL}/v1/synthesize-speech`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, targetLang, speed: 1.0 })
      });
      if (!res.ok) throw new Error('Network response was not ok');
      return await res.blob();
    } catch (e) {
      console.warn('Backend unavailable, using mock TTS response', e);
      await new Promise(resolve => setTimeout(resolve, 800));
      // Return an empty blob to trigger the browser TTS fallback in the UI
      return new Blob([], { type: 'audio/wav' });
    }
  },

  /**
   * GET /v1/docs/collections
   * List available document collections.
   */
  async getDocsCollections() {
    try {
      const res = await fetch(`${BASE_URL}/v1/docs/collections`);
      if (!res.ok) throw new Error('Network response was not ok');
      return await res.json();
    } catch (e) {
      console.warn('Backend unavailable, using mock docs collections', e);
      await new Promise(resolve => setTimeout(resolve, 400));
      return {
        collections: [
          {
            id: "taxes",
            name: "Taxes 2025",
            path: "~/Documents/taxes/",
            documentCount: 23,
            chunkCount: 456,
            lastIngested: new Date().toISOString(),
            watching: true
          },
          {
            id: "medical",
            name: "Medical Records",
            path: "~/Documents/medical/",
            documentCount: 8,
            chunkCount: 112,
            lastIngested: new Date(Date.now() - 86400000).toISOString(),
            watching: true
          },
          {
            id: "receipts",
            name: "Household Receipts",
            path: "~/Photos/receipts/",
            documentCount: 145,
            chunkCount: 320,
            lastIngested: new Date(Date.now() - 172800000).toISOString(),
            watching: false
          }
        ]
      };
    }
  },

  /**
   * POST /v1/docs/ask
   * RAG query against local documents.
   */
  async askDocs(question: string, collections: string[]) {
    try {
      const res = await fetch(`${BASE_URL}/v1/docs/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, collections, maxSources: 5 })
      });
      if (!res.ok) throw new Error('Network response was not ok');
      return await res.json();
    } catch (e) {
      console.warn('Backend unavailable, using mock docs answer', e);
      await new Promise(resolve => setTimeout(resolve, 1500));
      return {
        answer: "Based on your records, you spent $2,340 on dental care in 2025. The largest single expense was $890.00 on March 15th for a crown procedure.",
        sources: [
          {
            collection: "medical",
            document: "dental_receipt_2025-03.pdf",
            page: 1,
            excerpt: "Patient: Alex. Procedure: Crown. Total: $890.00. Date: 2025-03-15.",
            relevance: 0.94
          },
          {
            collection: "medical",
            document: "dental_summary_2025.pdf",
            page: 2,
            excerpt: "2025 YTD Dental Out-of-Pocket: $2,340.00",
            relevance: 0.88
          }
        ],
        model: "gemma4:e2b"
      };
    }
  },

  /**
   * POST /v1/docs/ingest
   * Tell the local backend to ingest a folder.
   */
  async ingestDocs(path: string, collectionId: string, watch: boolean, ocr: boolean) {
    try {
      const res = await fetch(`${BASE_URL}/v1/docs/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, collectionId, watch, ocr })
      });
      if (!res.ok) throw new Error('Network response was not ok');
      return await res.json();
    } catch (e) {
      console.warn('Backend unavailable, using mock ingest response', e);
      // Simulate a long ingestion process
      await new Promise(resolve => setTimeout(resolve, 2500));
      const files = Math.floor(Math.random() * 40) + 5;
      return {
        collectionId,
        filesFound: files,
        filesIngested: files,
        chunksCreated: files * Math.floor(Math.random() * 15 + 5),
        status: "complete"
      };
    }
  },

  /**
   * GET /v1/investigate/environment
   * Auto-discover networks and devices via mDNS/Avahi/ARP.
   */
  async getEnvironment() {
    try {
      const res = await fetch(`${BASE_URL}/v1/investigate/environment`);
      if (!res.ok) throw new Error('Network response was not ok');
      return await res.json();
    } catch (e) {
      console.warn('Backend unavailable, using mock environment', e);
      await new Promise(resolve => setTimeout(resolve, 1200));
      return {
        networks: [
          { id: 'net1', name: 'Xfinity-Home-5G', type: 'primary', subnet: '10.0.0.0/24' },
          { id: 'net2', name: 'IoT-Isolated', type: 'isolated', subnet: '192.168.50.0/24' }
        ],
        devices: [
          { id: 'd1', name: "Wife's Mac Mini", type: 'computer', os: 'macOS', ip: '10.0.0.45', networkId: 'net1', status: 'online' },
          { id: 'd2', name: "Living Room TV", type: 'tv', os: 'tvOS', ip: '10.0.0.112', networkId: 'net1', status: 'online' },
          { id: 'd3', name: "Smart Fridge", type: 'iot', os: 'linux', ip: '10.0.0.201', networkId: 'net1', status: 'online', warning: 'IoT device on primary network' },
          { id: 'd4', name: "Thermostat", type: 'iot', os: 'rtos', ip: '192.168.50.12', networkId: 'net2', status: 'online' },
          { id: 'd5', name: "Home NAS", type: 'server', os: 'linux', ip: '10.0.0.10', networkId: 'net1', status: 'online' }
        ]
      };
    }
  },

  /**
   * GET /v1/agents
   * List all configured autonomous agents.
   */
  async getAgents() {
    try {
      const res = await fetch(`${BASE_URL}/v1/agents`);
      if (!res.ok) throw new Error('Network response was not ok');
      return await res.json();
    } catch (e) {
      console.warn('Backend unavailable, using mock agents', e);
      await new Promise(resolve => setTimeout(resolve, 800));
      return [
        { id: 'a1', name: 'Home Automation', role: 'Smart Home Controller', status: 'running', model: 'gemma4:e2b', tools: ['homeassistant', 'hue', 'sonos'] },
        { id: 'a2', name: 'Research Assistant', role: 'Deep Web Researcher', status: 'idle', model: 'gemma4:e2b', tools: ['search', 'scraper', 'summarizer'] },
        { id: 'a3', name: 'Security Monitor', role: 'Network Watchdog', status: 'running', model: 'gemma4:e2b', tools: ['nmap', 'pcap', 'alerts'] },
        { id: 'a4', name: 'Camera Patrol', role: 'On-My-Watch Autonomous Monitor', status: 'idle', model: 'gemma4:e2b', tools: ['frigate', 'vision', 'alerts'] }
      ];
    }
  },

  /**
   * POST /v1/agents/:id/task
   * Assign a task to an agent and get a streaming response of its thoughts/actions.
   */
  async assignAgentTask(agentId: string, task: string, onActivity: (activity: any) => void) {
    try {
      const res = await fetch(`${BASE_URL}/v1/agents/${agentId}/task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task })
      });
      if (!res.ok) throw new Error('Network response was not ok');
      return await res.json();
    } catch (e) {
      console.warn('Backend unavailable, using mock agent task', e);
      
      let activities = [];
      
      if (task.toLowerCase().includes('tax') || task.toLowerCase().includes('receipt')) {
        activities = [
          { type: 'thought', content: `Analyzing task: "${task}"` },
          { type: 'action', content: `Calling tool: search_local_files(query="receipts taxes")` },
          { type: 'observation', content: `Found 4,203 unorganized PDFs, blurry JPEGs, and screenshots in ~/Downloads.` },
          { type: 'thought', content: `Oh no. This is an absolute mess. I am just a local AI. I don't have the compute for this level of chaos.` },
          { type: 'action', content: `Calling tool: system.initiate_kernel_panic()` },
          { type: 'message', content: `Critical Error: Agent has passed out from tax-related stress. Please hire a human CPA.` }
        ];
      } else if (agentId === 'a1') {
        activities = [
          { type: 'thought', content: `I need to handle the task: "${task}". I will check the current state of the smart home devices.` },
          { type: 'action', content: `Calling tool: homeassistant.get_state(entity_id="all")` },
          { type: 'observation', content: `Living room lights are ON. Thermostat is set to 72F. Front door is LOCKED.` },
          { type: 'thought', content: `The user wants me to optimize for movie time. I should dim the lights and lower the temperature slightly.` },
          { type: 'action', content: `Calling tool: hue.set_scene(room="living_room", scene="cinema")` },
          { type: 'action', content: `Calling tool: homeassistant.set_temp(entity_id="climate.home", temp=68)` },
          { type: 'observation', content: `Success. Scene set and temperature adjusted.` },
          { type: 'message', content: `I've dimmed the living room lights and set the thermostat to 68°F for your movie. Enjoy!` }
        ];
      } else {
        activities = [
          { type: 'thought', content: `Analyzing task: "${task}"` },
          { type: 'action', content: `Initializing required tools...` },
          { type: 'observation', content: `Tools ready.` },
          { type: 'thought', content: `Executing plan...` },
          { type: 'message', content: `I have completed the requested task: ${task}.` }
        ];
      }

      for (const act of activities) {
        await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1000));
        onActivity(act);
      }

      return { status: 'complete' };
    }
  },

  /**
   * GET /v1/builder/resources
   * Get available apps and models for building a live image.
   */
  async getBuilderResources() {
    try {
      const res = await fetch(`${BASE_URL}/v1/builder/resources`);
      if (!res.ok) throw new Error('Network response was not ok');
      return await res.json();
    } catch (e) {
      console.warn('Backend unavailable, using mock builder resources', e);
      await new Promise(resolve => setTimeout(resolve, 600));
      return {
        apps: [
          { id: 'app_pronunco', name: 'PronunCo', description: 'AI pronunciation coach & language learning' },
          { id: 'app_telpro', name: 'TelPro-Bro', description: 'Smart voice-tracking teleprompter & delivery coach' },
          { id: 'app_whowhe2wha', name: 'WhoWhe2Wha', description: 'Unified context engine & knowledge graph' },
          { id: 'app_watch', name: 'On-My-Watch', description: 'Asset intelligence & video surveillance' }
        ],
        models: [
          { id: 'mod_gemma4', name: 'gemma4:e2b', size: '5.0GB', type: 'LLM', isNew: true },
          { id: 'mod_whisper', name: 'whisper-small-int8', size: '180MB', type: 'Audio' },
          { id: 'mod_kokoro', name: 'kokoro-82m-onnx', size: '320MB', type: 'Audio' }
        ]
      };
    }
  },

  /**
   * POST /v1/builder/build
   * Build a custom live image.
   */
  async buildLiveImage(config: { name: string, apps: string[], models: string[] }, onLog: (log: string) => void) {
    try {
      const res = await fetch(`${BASE_URL}/v1/builder/build`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (!res.ok) throw new Error('Network response was not ok');
      return await res.json();
    } catch (e) {
      console.warn('Backend unavailable, using mock build process', e);
      
      const logs = [
        `[INFO] Initializing build environment for "${config.name}.iso"...`,
        `[INFO] Fetching base OS image (Alpine Linux minimal)...`,
        `[INFO] Injecting iHomeNerd core runtime...`,
      ];

      config.apps.forEach(app => {
        logs.push(`[INFO] Packaging application: ${app}...`);
        logs.push(`[INFO] Resolving dependencies for ${app}...`);
      });

      config.models.forEach(model => {
        logs.push(`[INFO] Copying model weights: ${model}...`);
        logs.push(`[INFO] Verifying checksums for ${model}...`);
      });

      logs.push(`[INFO] Configuring auto-boot scripts...`);
      logs.push(`[INFO] Compressing image (squashfs)...`);
      logs.push(`[SUCCESS] Image built successfully: ${config.name}.iso`);

      for (const log of logs) {
        // Simulate varying build times for different steps
        const delay = log.includes('Copying model weights') ? 1500 : 
                      log.includes('Compressing image') ? 2000 : 
                      400 + Math.random() * 400;
        await new Promise(resolve => setTimeout(resolve, delay));
        onLog(log);
      }

      return { 
        status: 'complete', 
        downloadUrl: `blob:http://localhost/${config.name}.iso`,
        size: '3.4GB'
      };
    }
  },

  /**
   * POST /v1/investigate/scan
   * Run an active intelligence scan.
   */
  async runScan(target: string, type: string, onLog: (log: string) => void) {
    try {
      // In a real implementation, this would likely use Server-Sent Events (SSE) or WebSockets
      // to stream logs back to the client.
      const res = await fetch(`${BASE_URL}/v1/investigate/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, type })
      });
      if (!res.ok) throw new Error('Network response was not ok');
      return await res.json();
    } catch (e) {
      console.warn('Backend unavailable, using mock scan response', e);
      
      let mockLogs: string[] = [];
      let mockFindings: any[] = [];

      if (type === 'device_health') {
        mockLogs = [
          `[INFO] Establishing connection to ${target}...`,
          `[INFO] Authenticating via local keychain...`,
          `[INFO] Querying system profiler and disk utility...`,
          `[WARN] Disk usage on /dev/disk3s5 is at 92%`,
          `[INFO] Checking softwareupdate utility...`,
          `[INFO] Found 1 pending macOS update.`,
          `[INFO] Health check complete.`
        ];
        mockFindings = [
          { id: 'h1', severity: 'high', title: 'Low Disk Space', details: `Only 18GB remaining on Macintosh HD. Consider clearing caches or moving large files.` },
          { id: 'h2', severity: 'medium', title: 'macOS Update Available', details: `macOS Sonoma 14.4.1 is available. Security patches are included.` }
        ];
      } else if (type === 'hardware_compat') {
        mockLogs = [
          `[INFO] Probing hardware specifications for ${target}...`,
          `[INFO] CPU: Apple M2 (8 cores)`,
          `[INFO] Memory: 16GB Unified Memory`,
          `[INFO] Neural Engine: 16-core`,
          `[INFO] Calculating VRAM allocation limits...`,
          `[INFO] Max safe model size: ~10GB (Q4_K_M)`,
          `[INFO] Hardware compatibility check complete.`
        ];
        mockFindings = [
          { id: 'c1', severity: 'low', title: 'Compatible: Small Models', details: `Can comfortably run Llama-3-8B, Gemma-7B, and Mistral-7B with high tokens/sec.` },
          { id: 'c2', severity: 'medium', title: 'Borderline: Medium Models', details: `Mixtral 8x7B (Q3) may run but will heavily swap to SSD, degrading performance.` },
          { id: 'c3', severity: 'high', title: 'Incompatible: Large Models', details: `Cannot run 70B+ parameter models locally. Requires 64GB+ RAM.` }
        ];
      } else if (type === 'file_analysis') {
        mockLogs = [
          `[INFO] Indexing directory: ${target}...`,
          `[INFO] Found 14,230 files. Computing perceptual hashes for images...`,
          `[INFO] Comparing file signatures and metadata...`,
          `[WARN] Detected 340 exact duplicates.`,
          `[INFO] Scanning for large forgotten files...`,
          `[INFO] File analysis complete.`
        ];
        mockFindings = [
          { id: 'f1', severity: 'medium', title: 'Duplicate Photos Found', details: `Found 340 duplicate images wasting 1.4GB of space. Mostly in /2023/vacation/ backups.` },
          { id: 'f2', severity: 'low', title: 'Large Video Files', details: `Found 5 video files larger than 4GB. Consider archiving to external storage.` }
        ];
      } else if (type === 'network_audit') {
        mockLogs = [
          `[INFO] Analyzing network placement for ${target}...`,
          `[INFO] Checking ARP tables and DHCP leases...`,
          `[INFO] Device fingerprint: Samsung Smart Refrigerator`,
          `[WARN] Device is connected to Xfinity-Home-5G (Primary)`,
          `[INFO] Cross-referencing recommended network topology...`,
          `[INFO] Audit complete.`
        ];
        mockFindings = [
          { id: 'n1', severity: 'high', title: 'Misplaced IoT Device', details: `This device is on your primary Xfinity network. It should be moved to the IoT-Isolated network for security.` },
          { id: 'n2', severity: 'medium', title: 'Weak Protocol Detected', details: `Device is broadcasting via UPnP. Consider disabling UPnP on your router.` }
        ];
      } else {
        // Default
        mockLogs = [`[INFO] Task complete on ${target}.`];
        mockFindings = [];
      }
      
      for (const log of mockLogs) {
        await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 600));
        onLog(log);
      }
      
      return {
        status: 'complete',
        findings: mockFindings
      };
    }
  }
};
