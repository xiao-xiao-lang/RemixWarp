(() => {
  'use strict';

  const MENU_TEXT_CN_CODE = '转换为中文code';
  const MENU_TEXT_TO_BLOCK = '转换为块型代码';
  const CN_CODE_PREFIX = '#<cn.code>';

  let isCNCodeFeatureInitialized = false;

  function getBlocklyWorkspace() {
    if (typeof Blockly !== 'undefined' && Blockly.getMainWorkspace) {
      return Blockly.getMainWorkspace();
    }
    return null;
  }

  function getSelectedBlocks() {
    const workspace = getBlocklyWorkspace();
    if (!workspace) return [];
    return workspace.getSelectedBlocks();
  }

  function convertBlockToCNCode(block) {
    if (!block) return '';

    let cnCode = '';

    try {
      const fields = block.inputList || [];
      for (const input of fields) {
        for (const field of input.fieldRow || []) {
          if (field.name) {
            const fieldObj = block.getField(field.name);
            if (fieldObj) {
              const fieldType = fieldObj.constructor.name;
              const fieldValue = fieldObj.getValue();

              if (fieldType === 'FieldTextInput' || fieldType === 'FieldNumber') {
                cnCode += `[${fieldValue}]`;
              } else if (fieldType === 'FieldDropdown') {
                try {
                  const menuGenerator = fieldObj.getOptions ? fieldObj.getOptions() : [];
                  const selectedOption = menuGenerator.find(opt => opt[1] === fieldValue);
                  const displayText = selectedOption ? selectedOption[0] : fieldValue;
                  cnCode += `<${displayText}>`;
                } catch (e) {
                  cnCode += `<${fieldValue}>`;
                }
              } else if (fieldType === 'FieldColour') {
                cnCode += `{${fieldValue}}`;
              } else if (fieldType === 'FieldAngle') {
                cnCode += `{${fieldValue}°}`;
              } else if (fieldType === 'FieldMatrix') {
                cnCode += `{matrix:${fieldValue}}`;
              } else if (fieldType === 'FieldNote') {
                cnCode += `{note:${fieldValue}}`;
              } else if (fieldType === 'FieldImage') {
                cnCode += `{image:${fieldValue}}`;
              } else {
                cnCode += `${fieldValue}`;
              }
            }
          }
        }
      }

      const children = block.getChildren ? block.getChildren() : [];
      for (const child of children) {
        cnCode += convertBlockToCNCode(child);
      }
    } catch (e) {
      console.error('Error converting block to CN code:', e);
    }

    return cnCode;
  }

  function generateCNCode(blocks) {
    let cnCode = CN_CODE_PREFIX + '\n';
    for (const block of blocks) {
      cnCode += convertBlockToCNCode(block) + '\n';
    }
    return cnCode;
  }

  function createCNCodeComment(blocks) {
    const workspace = getBlocklyWorkspace();
    if (!workspace || blocks.length === 0) return null;

    try {
      const cnCode = generateCNCode(blocks);
      const firstBlock = blocks[0];

      const xy = firstBlock.getRelativeToSurfaceXY();
      
      let comment;
      // Try TurboWarp's comment creation methods
      let creationSuccess = false;
      
      // Method 1: Try workspace.createComment
      if (typeof workspace.createComment === 'function') {
        try {
          comment = workspace.createComment(cnCode, 100, 100);
          if (comment) {
            if (comment.setPosition) comment.setPosition(xy.x + 200, xy.y);
            creationSuccess = true;
          }
        } catch (e) {
          console.log('workspace.createComment failed:', e.message);
        }
      }
      
      // Method 2: Try ScratchComment constructor if available
      if (!creationSuccess && typeof Blockly.ScratchComment === 'function') {
        try {
          comment = new Blockly.ScratchComment(workspace, cnCode, xy.x + 200, xy.y);
          if (comment) {
            creationSuccess = true;
          }
        } catch (e) {
          console.log('Blockly.ScratchComment failed:', e.message);
        }
      }
      
      // Method 3: Try workspace.addComment if available
      if (!creationSuccess && typeof workspace.addComment === 'function') {
        try {
          comment = workspace.addComment(cnCode, xy.x + 200, xy.y);
          if (comment) {
            creationSuccess = true;
          }
        } catch (e) {
          console.log('workspace.addComment failed:', e.message);
        }
      }
      
      // No more fallback to Blockly.WorkspaceComment
      if (!creationSuccess) {
        throw new Error('All comment creation methods failed');
      }

      if (comment) {
        // Set comment properties
        if (comment.setDeletable) comment.setDeletable(true);
        if (comment.setEditable) comment.setEditable(true);
        if (comment.setMovable) comment.setMovable(true);
        if (comment.setPosition) comment.setPosition(xy.x + 200, xy.y);

        const commentData = {
          id: comment.id || comment.get_id ? comment.get_id() : Math.random().toString(36).substr(2, 9),
          originalBlocks: blocks.map(b => b.id),
          isCNCode: true
        };

        comment.cnCodeData = commentData;
      }

      return comment;
    } catch (e) {
      console.error('Error creating CN code comment:', e);
      // Try direct DOM manipulation as last resort
      try {
        const commentElement = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        commentElement.setAttribute('class', 'scratchWorkspaceComment cn-code-comment');
        commentElement.setAttribute('transform', `translate(${xy.x + 200}, ${xy.y})`);
        
        // Add comment HTML content
        const foreignObject = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
        foreignObject.setAttribute('width', '200');
        foreignObject.setAttribute('height', '100');
        foreignObject.setAttribute('class', 'scratchCommentForeignObject');
        
        const div = document.createElement('div');
        div.setAttribute('class', 'scratchCommentBody');
        div.innerHTML = `<div class="scratchCommentTopBar"></div><pre class="scratchCommentText">${cnCode}</pre>`;
        
        foreignObject.appendChild(div);
        commentElement.appendChild(foreignObject);
        
        // Add to workspace
        const svg = workspace.getParentSvg();
        if (svg) {
          svg.appendChild(commentElement);
        }
        
        console.log('Created comment via DOM manipulation');
        return commentElement;
      } catch (domError) {
        console.error('Error creating comment via DOM:', domError);
        return null;
      }
    }
  }

  function convertCNCodeToBlocks(comment) {
    alert('中文code已准备转换为块型代码。\n\n注意：由于TurboWarp的限制，此功能需要手动重新拖拽相应的代码块。');
    comment.dispose();
  }

  function addCNCodeStyles() {
    if (document.getElementById('cn-code-styles')) return;

    const style = document.createElement('style');
    style.id = 'cn-code-styles';
    style.textContent = `
      .cn-code-comment {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
        border-radius: 8px !important;
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4) !important;
        border: 2px solid #a78bfa !important;
      }

      .cn-code-comment .scratchCommentBody {
        background: rgba(255, 255, 255, 0.95) !important;
        border-radius: 6px !important;
      }

      .cn-code-comment .scratchCommentRect {
        fill: #f0f4ff !important;
        stroke: #667eea !important;
        stroke-width: 2px !important;
      }

      .cn-code-comment .scratchCommentText {
        font-family: 'Courier New', 'Microsoft YaHei', monospace !important;
        font-size: 13px !important;
        line-height: 1.6 !important;
        color: #1a1a2e !important;
      }

      .cn-code-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        font-weight: bold;
        font-size: 12px;
        border-radius: 6px 6px 0 0;
        cursor: move;
        user-select: none;
      }

      .cn-code-title {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .cn-code-icon {
        width: 16px;
        height: 16px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 3px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
      }

      .cn-code-actions {
        display: flex;
        gap: 4px;
      }

      .cn-code-btn {
        width: 20px;
        height: 20px;
        border: none;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 3px;
        cursor: pointer;
        color: white;
        font-size: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
      }

      .cn-code-btn:hover {
        background: rgba(255, 255, 255, 0.5);
      }

      .cn-code-content {
        padding: 12px;
        max-height: 300px;
        overflow-y: auto;
        transition: max-height 0.3s ease;
      }

      .cn-code-content.minimized {
        max-height: 0;
        padding: 0;
        overflow: hidden;
      }

      .cn-code-minimized {
        max-height: 40px !important;
      }

      .cn-code-minimized .cn-code-content {
        display: none;
      }

      .cn-code-minimized .cn-code-header {
        border-radius: 6px;
      }

      .cn-code-compile-btn {
        width: 100%;
        padding: 6px;
        margin-top: 8px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        font-weight: bold;
        transition: transform 0.2s, box-shadow 0.2s;
      }

      .cn-code-compile-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
      }

      .cn-code-compile-btn:active {
        transform: translateY(0);
      }

      .cn-code-line {
        padding: 4px 0;
        border-bottom: 1px solid #e0e0e0;
      }

      .cn-code-line:last-child {
        border-bottom: none;
      }

      .cn-code-highlight {
        background: rgba(102, 126, 234, 0.1);
        padding: 2px 4px;
        border-radius: 3px;
      }

      @keyframes cnCodePulse {
        0%, 100% { box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); }
        50% { box-shadow: 0 4px 25px rgba(102, 126, 234, 0.6); }
      }

      .cn-code-comment:hover {
        animation: cnCodePulse 2s infinite;
      }
    `;
    document.head.appendChild(style);
  }

  function setupContextMenu() {
    const workspace = getBlocklyWorkspace();
    if (!workspace) return;

    const originalBlockContextMenu = Blockly.Block.prototype.customContextMenu;

    Blockly.Block.prototype.customContextMenu = function(menuOptions) {
      if (originalBlockContextMenu) {
        originalBlockContextMenu.call(this, menuOptions);
      }

      const blocks = getSelectedBlocks();
      if (blocks.length > 0) {
        menuOptions.push({
          text: MENU_TEXT_CN_CODE,
          enabled: true,
          callback: function() {
            createCNCodeComment(blocks);
          }
        });
      }
    };

    // Try to override comment context menu if available
    try {
      if (typeof Blockly.WorkspaceComment !== 'undefined') {
        const originalCommentContextMenu = Blockly.WorkspaceComment.prototype.customContextMenu;

        Blockly.WorkspaceComment.prototype.customContextMenu = function(menuOptions) {
          if (originalCommentContextMenu) {
            originalCommentContextMenu.call(this, menuOptions);
          }

          if (this.content && this.content.trim().startsWith(CN_CODE_PREFIX)) {
            menuOptions.push({
              text: MENU_TEXT_TO_BLOCK,
              enabled: true,
              callback: function() {
                convertCNCodeToBlocks(this);
              }.bind(this)
            });
          }
        };
      }
      // Also try for ScratchComment if it exists
      if (typeof Blockly.ScratchComment !== 'undefined') {
        const originalScratchCommentContextMenu = Blockly.ScratchComment.prototype.customContextMenu;

        Blockly.ScratchComment.prototype.customContextMenu = function(menuOptions) {
          if (originalScratchCommentContextMenu) {
            originalScratchCommentContextMenu.call(this, menuOptions);
          }

          if (this.content && this.content.trim().startsWith(CN_CODE_PREFIX)) {
            menuOptions.push({
              text: MENU_TEXT_TO_BLOCK,
              enabled: true,
              callback: function() {
                convertCNCodeToBlocks(this);
              }.bind(this)
            });
          }
        };
      }
    } catch (e) {
      console.error('Error setting up comment context menu:', e);
      // Fallback: We already have DOM-based context menu handling
    };
  }

  function setupDOMContextMenu() {
    document.addEventListener('contextmenu', function(e) {
      const target = e.target;
      
      const blockElement = target.closest('.blocklyDraggable');
      if (blockElement) {
        setTimeout(() => {
          const menu = document.querySelector('.goog-menu.blocklyContextMenu');
          if (menu && !menu.querySelector('.cn-code-menu-item')) {
            const blocks = getSelectedBlocks();
            if (blocks.length > 0) {
              const menuItem = document.createElement('div');
              menuItem.className = 'goog-menuitem cn-code-menu-item';
              menuItem.setAttribute('role', 'menuitem');
              menuItem.style.cssText = 'user-select: none;';
              
              const menuContent = document.createElement('div');
              menuContent.className = 'goog-menuitem-content';
              menuContent.style.cssText = 'user-select: none;';
              menuContent.textContent = MENU_TEXT_CN_CODE;
              
              menuItem.appendChild(menuContent);
              menuItem.addEventListener('click', function() {
                createCNCodeComment(blocks);
                menu.style.display = 'none';
              });
              
              menu.appendChild(menuItem);
            }
          }
        }, 100);
      }

      const commentElement = target.closest('.scratchWorkspaceComment');
      if (commentElement) {
        setTimeout(() => {
          const menu = document.querySelector('.goog-menu.blocklyContextMenu');
          if (menu && !menu.querySelector('.cn-code-to-block-menu-item')) {
            const commentText = commentElement.querySelector('.scratchCommentText');
            if (commentText && commentText.textContent.trim().startsWith(CN_CODE_PREFIX)) {
              const menuItem = document.createElement('div');
              menuItem.className = 'goog-menuitem cn-code-to-block-menu-item';
              menuItem.setAttribute('role', 'menuitem');
              menuItem.style.cssText = 'user-select: none;';
              
              const menuContent = document.createElement('div');
              menuContent.className = 'goog-menuitem-content';
              menuContent.style.cssText = 'user-select: none;';
              menuContent.textContent = MENU_TEXT_TO_BLOCK;
              
              menuItem.appendChild(menuContent);
              menuItem.addEventListener('click', function() {
                const workspace = getBlocklyWorkspace();
                if (workspace) {
                  const comments = workspace.getTopComments();
                  for (const comment of comments) {
                    if (comment.content && comment.content.trim().startsWith(CN_CODE_PREFIX)) {
                      convertCNCodeToBlocks(comment);
                      break;
                    }
                  }
                }
                menu.style.display = 'none';
              });
              
              menu.appendChild(menuItem);
            }
          }
        }, 100);
      }
    }, true);
  }

  function setupCommentChangeDetection() {
    const workspace = getBlocklyWorkspace();
    if (!workspace) return;

    // Try to override comment update for Blockly.WorkspaceComment
    try {
      if (typeof Blockly.WorkspaceComment !== 'undefined') {
        const originalCommentUpdate = Blockly.WorkspaceComment.prototype.update;
        
        Blockly.WorkspaceComment.prototype.update = function() {
          if (originalCommentUpdate) {
            originalCommentUpdate.call(this);
          }

          if (this.content && this.content.trim().startsWith(CN_CODE_PREFIX)) {
            const commentElement = document.querySelector(`[data-comment-id="${this.id}"]`);
            if (commentElement) {
              // 使用setAttribute替代classList.add，避免SVG元素的className错误
              const currentClass = commentElement.getAttribute('class') || '';
              if (!currentClass.includes('cn-code-comment')) {
                commentElement.setAttribute('class', currentClass + ' cn-code-comment');
              }
            }
          }
        };
      }
      // Also try for ScratchComment if it exists
      if (typeof Blockly.ScratchComment !== 'undefined') {
        const originalScratchCommentUpdate = Blockly.ScratchComment.prototype.update;
        
        Blockly.ScratchComment.prototype.update = function() {
          if (originalScratchCommentUpdate) {
            originalScratchCommentUpdate.call(this);
          }

          if (this.content && this.content.trim().startsWith(CN_CODE_PREFIX)) {
            const commentElement = this.svgGroup || document.querySelector(`[data-comment-id="${this.id}"]`);
            if (commentElement) {
              // 使用setAttribute替代classList.add，避免SVG元素的className错误
              const currentClass = commentElement.getAttribute('class') || '';
              if (!currentClass.includes('cn-code-comment')) {
                commentElement.setAttribute('class', currentClass + ' cn-code-comment');
              }
            }
          }
        };
      }
    } catch (e) {
      console.error('Error setting up comment change detection:', e);
    }

    // Use MutationObserver to detect changes in comment elements
    const svg = workspace.getParentSvg();
    if (svg) {
      const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          if (mutation.type === 'childList') {
            const addedNodes = Array.from(mutation.addedNodes);
            addedNodes.forEach(function(node) {
              if (node.tagName === 'g' && node.classList.contains('scratchWorkspaceComment')) {
                const commentText = node.querySelector('.scratchCommentText');
                if (commentText && commentText.textContent.trim().startsWith(CN_CODE_PREFIX)) {
                  node.classList.add('cn-code-comment');
                }
              }
            });
          } else if (mutation.type === 'characterData' || mutation.type === 'childList') {
            const commentElement = mutation.target.closest('.scratchWorkspaceComment');
            if (commentElement) {
              const commentText = commentElement.querySelector('.scratchCommentText');
              if (commentText && commentText.textContent.trim().startsWith(CN_CODE_PREFIX)) {
                commentElement.classList.add('cn-code-comment');
              } else {
                commentElement.classList.remove('cn-code-comment');
              }
            }
          }
        });
      });

      observer.observe(svg, {
        childList: true,
        subtree: true,
        characterData: true
      });

      // Store observer reference to clean up later if needed
      window.cnCodeCommentObserver = observer;
    }
  }

  function addToolbarButton() {
    console.log('CN Code: Looking for toolbar...');
    
    // Try different toolbar selectors for robustness
    const toolbarSelectors = [
      '.stage-header_stage-header-wrapper_1K4nD',
      '.stage-header',
      '.toolbar',
      '.menubar',
      '#app',
      'body'
    ];
    
    let toolbar = null;
    for (const selector of toolbarSelectors) {
      toolbar = document.querySelector(selector);
      if (toolbar) {
        console.log(`CN Code: Found toolbar using selector: ${selector}`);
        break;
      }
    }
    
    if (!toolbar) {
      console.log('CN Code: No toolbar found, trying body...');
      toolbar = document.body;
    }

    const button = document.createElement('button');
    button.className = 'cn-code-toolbar-button';
    button.innerHTML = '中文Code';
    button.style.cssText = `
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 4px;
      padding: 8px 16px;
      margin: 10px;
      cursor: pointer;
      font-size: 14px;
      font-weight: bold;
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
      transition: transform 0.2s, box-shadow 0.2s;
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 999999;
    `;
    button.addEventListener('mouseenter', function() {
      this.style.transform = 'translateY(-2px)';
      this.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.6)';
    });
    button.addEventListener('mouseleave', function() {
      this.style.transform = 'translateY(0)';
      this.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.4)';
    });
    button.addEventListener('click', showCNCodeEditor);

    toolbar.appendChild(button);
  }

  function showCNCodeEditor() {
    let blocks = [];
    let cnCode = '';
    
    try {
      blocks = getSelectedBlocks();
      if (blocks.length > 0) {
        cnCode = generateCNCode(blocks);
      } else {
        cnCode = CN_CODE_PREFIX + '\n';
      }
    } catch (e) {
      console.error('Error generating CN code:', e);
      cnCode = CN_CODE_PREFIX + '\n';
    }

    const overlay = document.createElement('div');
    overlay.className = 'cn-code-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100000;
    `;

    const modal = document.createElement('div');
    modal.className = 'cn-code-modal';
    modal.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 24px;
      width: 600px;
      max-width: 90%;
      max-height: 80vh;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
    `;

    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    `;
    header.innerHTML = `
      <h2 style="margin: 0; color: #1a1a2e; font-size: 20px;">中文Code 编辑器</h2>
      <button class="cn-code-close" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">×</button>
    `;

    const textarea = document.createElement('textarea');
    textarea.className = 'cn-code-textarea';
    textarea.value = cnCode;
    textarea.style.cssText = `
      width: 100%;
      height: 300px;
      padding: 12px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-family: 'Courier New', 'Microsoft YaHei', monospace;
      font-size: 14px;
      line-height: 1.6;
      resize: vertical;
      box-sizing: border-box;
    `;
    textarea.addEventListener('input', function() {
      cnCode = this.value;
    });

    const buttons = document.createElement('div');
    buttons.style.cssText = `
      display: flex;
      gap: 10px;
      margin-top: 20px;
      justify-content: flex-end;
    `;

    const cancelButton = document.createElement('button');
    cancelButton.textContent = '取消';
    cancelButton.style.cssText = `
      background: #e0e0e0;
      color: #333;
      border: none;
      border-radius: 6px;
      padding: 10px 20px;
      cursor: pointer;
      font-size: 14px;
    `;
    cancelButton.addEventListener('click', function() {
      overlay.remove();
    });

    const createButton = document.createElement('button');
    createButton.textContent = '创建注释';
    createButton.style.cssText = `
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 6px;
      padding: 10px 20px;
      cursor: pointer;
      font-size: 14px;
      font-weight: bold;
    `;
    createButton.addEventListener('click', function() {
      try {
        if (typeof Blockly === 'undefined') {
          alert('Blockly 尚未完全加载，请稍后再试');
          return;
        }
        
        const workspace = getBlocklyWorkspace();
        if (workspace) {
          let comment;
          // Try TurboWarp's comment creation methods
          let creationSuccess = false;
          
          // Method 1: Try workspace.createComment
          if (typeof workspace.createComment === 'function') {
            try {
              comment = workspace.createComment(cnCode, 100, 100);
              if (comment) {
                creationSuccess = true;
              }
            } catch (e) {
              console.log('workspace.createComment failed:', e.message);
            }
          }
          
          // Method 2: Try ScratchComment constructor if available
          if (!creationSuccess && typeof Blockly.ScratchComment === 'function') {
            try {
              comment = new Blockly.ScratchComment(workspace, cnCode, 100, 100);
              if (comment) {
                creationSuccess = true;
              }
            } catch (e) {
              console.log('Blockly.ScratchComment failed:', e.message);
            }
          }
          
          // Method 3: Try workspace.addComment if available
          if (!creationSuccess && typeof workspace.addComment === 'function') {
            try {
              comment = workspace.addComment(cnCode, 100, 100);
              if (comment) {
                creationSuccess = true;
              }
            } catch (e) {
              console.log('workspace.addComment failed:', e.message);
            }
          }
          
          if (creationSuccess && comment) {
            // Set comment properties
            if (comment.setDeletable) comment.setDeletable(true);
            if (comment.setEditable) comment.setEditable(true);
            if (comment.setMovable) comment.setMovable(true);
            alert('注释已成功创建！');
          } else {
            // All regular methods failed, use DOM manipulation
            throw new Error('All comment creation methods failed');
          }
        }
      } catch (e) {
        console.error('Error creating comment:', e);
        // Try direct DOM manipulation as last resort
        try {
          const commentElement = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          commentElement.setAttribute('class', 'scratchWorkspaceComment cn-code-comment');
          commentElement.setAttribute('transform', 'translate(100, 100)');
          
          // Add comment HTML content
          const foreignObject = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
          foreignObject.setAttribute('width', '200');
          foreignObject.setAttribute('height', '100');
          foreignObject.setAttribute('class', 'scratchCommentForeignObject');
          
          const div = document.createElement('div');
          div.setAttribute('class', 'scratchCommentBody');
          div.innerHTML = `<div class="scratchCommentTopBar"></div><pre class="scratchCommentText">${cnCode}</pre>`;
          
          foreignObject.appendChild(div);
          commentElement.appendChild(foreignObject);
          
          // Add to workspace
          const svg = workspace.getParentSvg();
          if (svg) {
            svg.appendChild(commentElement);
            alert('注释已成功创建！');
          }
        } catch (domError) {
          console.error('Error creating comment via DOM:', domError);
          alert('创建注释失败: ' + domError.message);
        }
      } finally {
        overlay.remove();
      }
    });

    buttons.appendChild(cancelButton);
    buttons.appendChild(createButton);

    modal.appendChild(header);
    modal.appendChild(textarea);
    modal.appendChild(buttons);
    overlay.appendChild(modal);

    header.querySelector('.cn-code-close').addEventListener('click', function() {
      overlay.remove();
    });

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) {
        overlay.remove();
      }
    });

    document.body.appendChild(overlay);
  }

  function init() {
    if (isCNCodeFeatureInitialized) return;

    // 先添加工具栏按钮，不依赖Blockly
    addToolbarButton();
    
    // 添加样式
    addCNCodeStyles();

    // 如果Blockly未加载，只初始化DOM相关的功能
    if (typeof Blockly === 'undefined') {
      setupDOMContextMenu();
      setTimeout(init, 500);
      return;
    }

    setupContextMenu();
    setupCommentChangeDetection();

    isCNCodeFeatureInitialized = true;
    console.log('CN Code Feature initialized');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.CNCodeFeature = {
    convertBlockToCNCode,
    generateCNCode,
    createCNCodeComment,
    convertCNCodeToBlocks
  };

  // Also expose directly to window for backward compatibility
  window.createCNCodeComment = createCNCodeComment;
  window.convertCNCodeToBlocks = convertCNCodeToBlocks;
  window.generateCNCode = generateCNCode;
  window.convertBlockToCNCode = convertBlockToCNCode;
})();
