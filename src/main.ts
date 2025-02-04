// Google Generative AI SDK for Gemini API calls
import { GoogleGenerativeAI } from '@google/generative-ai';

// external JS libraries
declare const NProgress: any;
declare const ace: any;

// experimental web file system API
declare global {
  interface Window {
    showSaveFilePicker?: any;
  }
}

// create Ace Editors
// mode defaults to text
const srcEditor = ace.edit('src-editor', { mode: 'ace/mode/text' });
const tgtEditor = ace.edit('tgt-editor', { mode: 'ace/mode/text' });
// global variables for source and target languages
let srcLang = 'text';
let tgtLang = 'text';
// the relationship between source code and target code
// format: [source line] : [target lines]
// can be null, meaning no connections are made yet
let connections: Map<number, number[]> | null = null;

// Ace themes
const aceDarkTheme = 'clouds_midnight';
const aceLightTheme = 'xcode';

// Theme
(() => {
  enum Theme { Light, Dark, System }
  // the current exact theme
  let currentTheme: Theme.Dark | Theme.Light = Theme.Dark;

  const isInDarkTheme = () => window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const systemThemeCallback = () => setTheme(Theme.System);
  function setTheme(theme: Theme) {
    // get the theme name and set system theme callback
    let themeName: 'dark' | 'light';
    if (theme === Theme.Dark) {
      currentTheme = Theme.Dark;
      themeName = 'dark';
      window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', systemThemeCallback);
    } else if (theme === Theme.Light) {
      currentTheme = Theme.Light;
      themeName = 'light';
      window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', systemThemeCallback);
    } else {
      const dark = isInDarkTheme();
      currentTheme = dark ? Theme.Dark : Theme.Light;
      themeName = dark ? 'dark' : 'light';
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', systemThemeCallback);
    }

    // change the editor theme
    const aceThemeName = currentTheme === Theme.Dark ? aceDarkTheme : aceLightTheme;
    const aceThemePath = `ace/theme/${aceThemeName}`;
    srcEditor.setTheme(aceThemePath);
    tgtEditor.setTheme(aceThemePath);

    // change the css theme
    document.documentElement.setAttribute('data-theme', themeName);
    // change the stored theme name
    localStorage.setItem('theme', theme === Theme.System ? 'system' : themeName);
  }

  // check and apply the stored theme
  {
    const themeName = localStorage.getItem('theme');
    if (themeName === 'dark') {
      setTheme(Theme.Dark);
    } else if (themeName === 'light') {
      setTheme(Theme.Light);
    } else {
      setTheme(Theme.System);
    }
  }

  // theme button
  let themeTemp: Theme = currentTheme;
  const button = document.getElementById('theme-btn')!;
  const darkSVG = document.getElementById('theme-dark')!;
  const lightSVG = document.getElementById('theme-light')!;
  const systemSVG = document.getElementById('theme-system')!;
  function showIcon() {
    darkSVG.style.display = 'none';
    lightSVG.style.display = 'none';
    systemSVG.style.display = 'none';
    switch (themeTemp) {
      case Theme.Dark:
        darkSVG.style.display = 'inline';
        break;
      case Theme.Light:
        lightSVG.style.display = 'inline';
        break;
      case Theme.System:
        systemSVG.style.display = 'inline';
    }
  }
  showIcon();
  button.addEventListener('click', () => {
    if (themeTemp === Theme.System) themeTemp = Theme.Light;
    else if (themeTemp === Theme.Light) themeTemp = Theme.Dark;
    else themeTemp = Theme.System;
    showIcon();
    setTheme(themeTemp);
  });
})();

// Divider
(() => {
  const divider = document.getElementById('divider')!;
  const left = document.getElementById('left')!;
  const right = document.getElementById('right')!;
  let isDragging = false;

  // when mouse is down on the divider, the user is dragging
  divider.addEventListener('mousedown', function (e) {
    e.preventDefault();
    isDragging = true;
  });

  // when dragging, the divider sets the left and right width
  document.addEventListener('mousemove', function (e) {
    if (!isDragging) return;
    e.preventDefault();
    left.style.width = `${e.clientX - 5}px`;
    right.style.width = `${window.innerWidth - e.clientX - 5}px`;
  });

  // stop dragging when mouse is up
  document.addEventListener('mouseup', (e) => {
    if (!isDragging) return;
    e.preventDefault();
    isDragging = false;
    // resize the editor at the end
    srcEditor.resize();
    tgtEditor.resize();
  });

  // resize upon window resize events
  window.addEventListener('resize', () => {
    const leftWidth = left.getBoundingClientRect().width;
    const innerWidth = window.innerWidth - 30;
    right.style.width = `${innerWidth - leftWidth}px`;
    srcEditor.resize();
    tgtEditor.resize();
  });
})();

// Language selection
(() => {
  // This list is for syntax highlighting
  const LanguageList: Map<string, string> = new Map([
    ['C', 'c_cpp'],
    ['C++', 'c_cpp'],
    ['C#', 'csharp'],
    ['CSS', 'css'],
    ['Go', 'golang'],
    ['HTML', 'html'],
    ['Java', 'java'],
    ['JavaScript', 'javascript'],
    ['JSON', 'json'],
    ['Markdown', 'markdown'],
    ['Python', 'python'],
    ['x86 ASM', 'assembly_x86'],
  ]);

  // create a dropdown menu in an element
  // cb is called upon selection
  const createDropdown = (id: string, cb: (lang: string) => void) => {
    const container = document.getElementById(id)!;
    container.classList.add('dropdown');

    // add the main button
    const button = document.createElement('button');
    button.innerText = 'Text';
    button.className = 'dropdown-btn';
    button.addEventListener('click', (e) => {
      e.preventDefault();
      languageList.style.display = languageList.style.display === 'block' ? 'none' : 'block';
    });

    const languageList = document.createElement('ul');
    languageList.className = 'dropdown-list';
    LanguageList.forEach((v: string, k: string, _m: Map<string, string>) => {
      const language = document.createElement('li');
      language.className = 'dropdown-lang';
      language.innerText = k;
      language.addEventListener('click', (e) => {
        e.preventDefault();
        button.innerText = k;
        cb(v);
      });
      languageList.appendChild(language);
    });

    // add the custom option
    const customLanguage = document.createElement('li');
    customLanguage.className = 'dropdown-lang';
    customLanguage.innerText = 'Custom...';
    customLanguage.addEventListener('click', (e) => {
      e.preventDefault();
      showPrompt('Custom Language', '', (language: string) => {
        if (language === null) return;
        button.innerText = language;
        cb(language);
      });
    });

    languageList.appendChild(customLanguage);

    container.appendChild(button);
    container.appendChild(languageList);

    // when other places are clicked, the dropdown menu should disappear
    window.addEventListener('click', (e) => {
      if (e.target === null) return;
      const target = e.target as HTMLElement;
      if (languageList.style.display === 'none') return;
      if (target.className === 'dropdown-btn' && target.parentElement!.id === id) return;
      languageList.style.display = 'none';
    });
  };

  // create two dropdown menus for source and target languages
  createDropdown('src-language', (lang: string) => {
    srcEditor.session.setMode(`ace/mode/${lang.toLowerCase()}`);
    srcLang = lang;
  });
  createDropdown('tgt-language', (lang: string) => {
    tgtEditor.session.setMode(`ace/mode/${lang.toLowerCase()}`);
    tgtLang = lang;
  });
})();

// Gemini API
(() => {
  function parseGeminiResponse(resp: string) {
    let result: [string | null, Map<number, number[]> | null] = [null, null];
    if (resp.includes('Unable to convert. ')) return result;

    // get the code from the code block
    const contentPattern = /^```.+?$\n(.*?)\n^```$/ms;
    const content = contentPattern.exec(resp);
    // invalid response
    if (content === null || content.length === 0) return result;

    const lines = content[1].split('\n');
    // get the corresponding line in the source code
    const linePattern = /\/\/ *Source *: *(\d+)(?: *, *(\d+))* *$/;
    const connections: Map<number, number[]> = new Map();
    const text: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const source = linePattern.exec(line);
      // if no connection is made, just add the line
      if (source === null || source.length === 0) {
        text.push(line);
        continue;
      }
      // remove undefined values from source
      const strings = source.filter(element => element !== undefined).slice(1);
      // convert them into numbers
      const numbers: number[] = [];
      for (const str of strings) {
        numbers.push(Number(str) - 1);
      }
      connections.set(i, numbers);
      text.push(line.slice(0, line.lastIndexOf('//')).replace(/\s+$/, ''));
    }

    result = [text.join('\n'), connections];
    return result;
  }

  function getModel() {
    const apiKey = localStorage.getItem('apiKey');
    if (apiKey === null || apiKey === '') return null;
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });
    return model;
  }

  const generationConfig = {
    temperature: 0, // no creativity needed, just convert the code
    topP: 0.95,
    topK: 64,
    maxOutputTokens: 8192,
    stopSequences: [
      "Unable to convert. ", // stop if unable to convert
    ],
    responseMimeType: "text/plain",
  };

  // add line numbers to source code
  // to help Gemini cite the source code. 
  function addLineNumbers(text: string): string {
    const lines = text.split('\n');
    const lastNumber = lines.length;
    const digits = Math.ceil(Math.log10(lastNumber));
    return lines.map((line, index) => {
      const lineNumber = (index + 1).toString().padEnd(digits, ' ');
      return `${lineNumber} ${line}`
    }).join('\n');
  }

  async function askGemini(source: string) {
    // examples for Gemini
    const parts = [
      { text: "Convert the source code to the target language, maintaining all functionalities. Adhere to the target language's coding conventions where possible. After each line of the converted code, add a comment \"// Source: [line number]\" to indicate the corresponding line in the source code. Use double slashes no matter what language it is. If conversion while preserving meaning is impossible, simply respond with \"Unable to convert.\"" },
      { text: "source code: ```python\n1 def contains_double_spaces(s):\n2     return \"  \" in s\n```\nto go" },
      { text: "target code: ```go\nfunc containsDoubleSpaces(s string) bool { // Source: 1\n    return strings.Contains(s, \"  \") // Source: 2\n} // Source: 1\n```" },
      { text: "source code: ```go\n1 func containsDoubleSpaces(s string) bool {\n2     return strings.Contains(s, \"  \")\n3 }\n```\nto python" },
      { text: "target code: ```python\ndef contains_double_spaces(s): // Source: 1, 3\n    return \"  \" in s // Source: 2\n```" },
      { text: "source code: ```javascript\n1 function compute(a, b) {\n2     return a * b - 1;\n3 }\n```\nto python" },
      { text: "target code: ```python\ndef compute(a, b): // Source: 1, 3\n    return a * b - 1 // Source: 2\n```" },
      { text: "source code: ```typescript\n1 console.log(\"Yes!\");\n```\nto bash" },
      { text: "target code: ```bash\necho \"Yes!\" // Source: 1\n```" },
      { text: "source code: ```html\n1 There it goes. \n```\nto sql" },
      { text: "target code: Unable to convert." },
      { text: "source code: ```english\n1 A hello world program. \n```\nto cpp" },
      { text: "target code: ```cpp\n#include" },
      { text: "source code: ```c\n1 bool is_odd(const int num) {\n2     return num & 1;\n3 }\n```\nto chinese" },
      { text: "target code: ```chinese\n这个函数检查一个数是否为奇数。它利用了奇数二进制最后一位总是1的特性。\nnum & 1 只保留 num 的最后一位:\n\n若为1,结果非0(true),说明是奇数\n若为0,结果为0(false),说明是偶数\n\n这比用 % 判断更快。\n```" },
      { text: "source code: " + source },
      { text: "target code: " },
    ];

    let model;
    try {
      model = getModel();
    } catch (e) {
      showMsg('Invalid API Key');
      showPrompt('API Key', '', (v: string) => localStorage.setItem('apiKey', v));
      console.warn(`error getting Gemini model: ${e}`);
      return [null, null];
    }
    if (model === null) {
      showMsg('Set API Key First');
      showPrompt('API Key', '', (v: string) => localStorage.setItem('apiKey', v));
      return [null, null];
    }

    let result;
    try {
      result = await model.generateContent({
        contents: [{ role: "user", parts }],
        generationConfig,
      });
    } catch (e) {
      showMsg('Failed to Convert');
      console.warn(`error calling Gemini API: ${e}`);
      return [null, null];
    }

    let text;
    try {
      text = result.response.text();
    } catch (e) {
      showMsg('Failed to Convert');
      console.warn(`error calling Gemini API: ${e}`);
      return [null, null];
    }
    return parseGeminiResponse(text);
  }

  let folded = false;
  const convertMsg = document.getElementById('convert-msg')! as HTMLTextAreaElement;
  const foldBtn = document.getElementById('convert-msg-fold')!;
  foldBtn.addEventListener('click', () => {
    folded = !folded;
    convertMsg.style.maxHeight = '40px';
    if (folded) {
      foldBtn.style.rotate = '180deg';
      foldBtn.title = 'Fold';
    } else {
      convertMsg.style.maxHeight = '60vh';
      foldBtn.style.rotate = '0deg';
      foldBtn.title = 'Expand';
    }
  });
  convertMsg.addEventListener('input', () => {
    if (folded) return;
    convertMsg.style.height = '';
    convertMsg.style.height = String(convertMsg.scrollHeight) + 'px';
  });

  document.getElementById('convert-btn')!.addEventListener('click', () => {
    // get source code
    const value = srcEditor.getValue();
    if (value === '') {
      showMsg("No source code provided");
      return;
    }
    NProgress.start(); // start the progress bar
    askGemini(
      '```' + srcLang + '\n' + addLineNumbers(value) + '\n```\nto ' + tgtLang + '\n' + convertMsg.value
    ).then((value) => {
      const [text, conn] = value;
      connections = conn;
      NProgress.done(); // end the progress bar
      if (text === null || conn === null) return;
      tgtEditor.setValue(text); // show the target code
    });
  });
})();

// Text copying
(() => {
  const srcButton = document.getElementById('src-copy')!;
  const tgtButton = document.getElementById('tgt-copy')!;
  srcButton.addEventListener('click', async () => {
    await navigator.clipboard.writeText(srcEditor.getValue());
    showMsg('Copied');
  });
  tgtButton.addEventListener('click', async () => {
    await navigator.clipboard.writeText(tgtEditor.getValue());
    showMsg('Copied');
  });
})();

// Editor
(() => {
  // remove markers in an editor
  function removeMarkers(editor: any) {
    const prevMarkers = editor.session.getMarkers();
    if (!prevMarkers) return;
    const prevMarkersArr = Object.keys(prevMarkers);
    for (const item of prevMarkersArr) {
      editor.session.removeMarker(prevMarkers[item].id);
    }
  }

  // when a line in target code as selected, 
  // the corresponding source code should also be highlighted
  // to show the connection
  tgtEditor.session.selection.on('changeSelection', () => {
    if (connections === null) return;
    const row: number = tgtEditor.getCursorPosition().row;
    removeMarkers(srcEditor);
    const rows = connections.get(row);
    if (rows === undefined) return;
    for (const row of rows) {
      srcEditor.session.addMarker(new ace.Range(row, 0, row, 1), 'ace-highlight', 'fullLine');
    }
  });

  // capture ctrl + s
  async function save(editor: any) {
    // do nothing is file system API isn't supported
    if (window.showSaveFilePicker === undefined) return;
    let file: FileSystemFileHandle;
    try {
      file = await window.showSaveFilePicker({
        suggestedName: 'code'
      });
    } catch (e) {
      return;
    }

    const writable = await file.createWritable();
    await writable.write(editor.getValue());
    await writable.close();

    showMsg('Saved');
  }

  const command = {
    name: 'save',
    bindKey: { win: "Ctrl-S", "mac": "Cmd-S" },
    exec: save
  };

  srcEditor.commands.addCommand(command);
  tgtEditor.commands.addCommand(command);
})();

// Prompt
const showPrompt = (() => {
  // get the elements
  const box = document.getElementById('prompt-box')!;
  const cover = document.getElementById('page-cover')!;
  const title = document.getElementById('prompt-title')!;
  const cancel = document.getElementById('prompt-cancel')!;
  const save = document.getElementById('prompt-save')!;
  const input: HTMLInputElement = document.getElementById('prompt-input')! as HTMLInputElement;

  // callback upon save
  let callback: (v: string) => void = () => { };

  // when the input element is focused, select the text to make it easy to erase
  input.addEventListener('focus', () => {
    input.select();
  });

  function hidePrompt() {
    // hide the box
    box.style.display = 'none';
    cover.style.display = 'none';
  }

  function showPrompt(promptTitle: string, value: string, cb: (v: string) => void) {
    callback = cb; // set the callback
    // set the title and the existing input value
    title.innerText = promptTitle;
    input.value = value;
    // show the box
    box.style.display = 'block';
    cover.style.display = 'block';
  }
  cancel.addEventListener('click', hidePrompt);
  save.addEventListener('click', () => {
    hidePrompt();
    callback(input.value); // call the callback
    callback = () => { }; // reset the callback function
  });
  cover.addEventListener('click', hidePrompt);

  return showPrompt;
})();

// Message popup
const showMsg = (() => {
  const messagePopup = document.getElementById('message-popup')!;
  let lastID: number | null = null; // save the setTimeout id so it can be canceled later

  function showMsg(message: string) {
    // If the last message isn't closed, reset the timer
    if (lastID !== null) {
      clearTimeout(lastID);
      lastID = null;
    }

    messagePopup.innerText = message; // Set the message text
    messagePopup.style.display = 'block';
    setTimeout(() => {
      messagePopup.style.opacity = '1';
    }, 0.0001); // Show the popup

    // Close the popup after 3 seconds
    lastID = setTimeout(() => {
      messagePopup.style.opacity = '0';
      lastID = setTimeout(() => {
        messagePopup.style.display = 'none';
        lastID = null;
      }, 200);
    }, 3000);
  }
  return showMsg;
})();

// API Key Button
(() => {
  document.getElementById('key-btn')!.addEventListener('click', () => {
    const key = localStorage.getItem('apiKey');
    const cb = (v: string) => localStorage.setItem('apiKey', v);
    if (key === null) showPrompt('API Key', '', cb);
    else showPrompt('API Key', key, cb);
  });
})();

// Show the container
document.getElementById('container')!.style.display = 'flex';
(() => {
  const loading = document.getElementById('loading')!;
  loading.style.opacity = '0';
  setTimeout(() => loading.remove(), 1000);
})();
