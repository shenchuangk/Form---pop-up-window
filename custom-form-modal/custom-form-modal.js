/**
 * 自定义表单弹窗组件
 * 提供灵活的表单配置和交互功能
 */
import { registerModal, getModalConfig } from '../modal-registry/modal-registry.js'

class CustomFormModal extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.container = document.createElement('div');
    this.shadowRoot.appendChild(this.container);

    // 组件属性
    this.properties = {
      show: false,
      title: '自定义窗口',
      config: [],
      formData: {},
      modalName: '',
      initData: null,
      popoverData: {}
    };

    this.processedConfig = {};
    this.formInputs = new Map();
    this.ParentConfig = {};

    // 加载样式
    this.loadStyles();
  }

  // 加载样式文件
  async loadStyles() {
    try {
      const response = await fetch('./components/custom-form-modal/custom-form-modal.css');
    const response1 = await fetch('https://cdnjs.cloudflare.com/ajax/libs/select2/4.0.13/css/select2.min.css');
    const response2 = await fetch('https://cdnjs.cloudflare.com/ajax/libs/select2-bootstrap-theme/0.1.0-beta.10/select2-bootstrap.min.css');


      let css = await response.text();

      css+=await response1.text();

      css+=await response2.text();
      
      // 添加隐藏搜索框默认按钮的样式
      css += `
        /* 隐藏 Chrome/Safari 搜索框清除按钮 */
        input[type="search"]::-webkit-search-cancel-button {
          display: none;
        }
        
        /* 隐藏 Firefox 搜索框清除按钮 */
        input[type="search"]::-moz-search-cancel-button {
          display: none;
        }
        
        /* 隐藏搜索框默认图标（部分浏览器） */
        input[type="search"] {
          -webkit-appearance: none;
          appearance: none;
        }
      `;
      
      const style = document.createElement('style');
      style.textContent = css;
      this.shadowRoot.appendChild(style);
    } catch (error) {
      console.warn('无法加载样式文件:', error);
    }
  }

  // 打开弹窗
  open() {
    const overlay = this.shadowRoot.querySelector('.custom-form-modal-overlay');
    if (overlay) {
      overlay.style.display = 'flex';

      // 触发动画
      setTimeout(() => {
        const modal = this.shadowRoot.querySelector('.custom-form-modal');
        if (modal) {
          modal.style.transform = 'scale(1)';
          overlay.style.opacity = '1';
        }
      }, 10);
    }
  }

  // 关闭弹窗
  close() {
    console.log(this.properties.popoverData)

    const overlay = this.shadowRoot.querySelector('.custom-form-modal-overlay');
    const modal = this.shadowRoot.querySelector('.custom-form-modal');

    if (modal && overlay) {
      modal.style.transform = 'scale(0.8)';
      overlay.style.opacity = '0';

      // 动画结束后隐藏
      setTimeout(() => {
        // 清理 select2 实例
        this.cleanupSelect2();
        overlay.style.display = 'none';
        
        // 解析 Promise（关闭操作）
        if (this._resolvePromise) {
          this._resolvePromise({ action: 'close' });
          this._resolvePromise = null;
          this._rejectPromise = null;
        }
       
        
        // 如果有父级弹窗数据，触发重新渲染以恢复父级弹窗
        if (this.properties.popoverData && Object.keys(this.properties.popoverData).length > 0) {
          // 延迟一点时间确保当前弹窗完全关闭
          setTimeout(() => {
            const parentModal = this.properties.popoverData;
            console.log('恢复父级弹窗数据:', parentModal);
            
            // 完全重置为父级弹窗的状态
            this.properties = {
              show: false,
              title: parentModal.title || '自定义窗口',
              config: parentModal.config || [],
              formData: parentModal.formData || {},
              modalName: parentModal.modalName || '',
              initData: parentModal.initData || null,
              popoverData: parentModal.popoverData || {}
            };
            
            // 重新设置属性到DOM元素
            if (parentModal.modalName) {
              this.setAttribute('modalname', parentModal.modalName);
            }
            if (parentModal.config && typeof parentModal.config === 'object') {
              this.setAttribute('config', JSON.stringify(parentModal.config));
            }
            if (parentModal.initData) {
              this.setAttribute('initdata', JSON.stringify(parentModal.initData));
            }
            
            // 重新渲染并打开父级弹窗
            this.render().then(() => {
              console.log('父级弹窗渲染完成，准备打开');
              this.open();
            }).catch(error => {
              console.error('恢复父级弹窗失败:', error);
            });
          }, 100);
        }
      }, 300);
    }
  }

  // 检查弹窗是否已打开
  isOpen() {
    const overlay = this.shadowRoot.querySelector('.custom-form-modal-overlay');
    return overlay && overlay.style.display === 'flex';
  }
  /**
   *   处理弹窗显示前的数据
   * @param {*} config 
   * @returns 
   */
async processBeforeShow(config) {
  // 安全检查：如果config为空，返回默认值
  if (!config || typeof config !== 'object') {
    return {
      processedConfig: { config: [] },
      extraData: {}
    };
  }

  const initData = this.properties.initData;
  let processedConfig = { ...config };
  let extraData = {};
  
  // 优先处理 beforeShow 函数
  if (typeof config.beforeShow === 'function') {
    // 统一传入 initData 给 beforeShow
    const beforeData = await config.beforeShow(initData);
    
    if (beforeData && typeof beforeData === "object") {
      const configFields = new Set(config.config.map(item => item.field));
      
      // 更新配置项
      processedConfig.config = config.config.map(configItem => {
        const key = configItem.field;
        if (beforeData.hasOwnProperty(key)) {
          return { ...configItem, ...beforeData[key] };
        }
        return configItem;
      });
      
      // 收集额外字段
      Object.keys(beforeData).forEach(key => {
        if (!configFields.has(key)) {
          extraData[key] = beforeData[key];
        }
      });
      return { processedConfig, extraData };
    }
  }
  
  // 没有 beforeShow 时直接处理 initData
  if (initData) {
    if (Array.isArray(initData)) {
      processedConfig.config = config.config.map((item, index) =>
        index < initData.length
          ? { ...item, ...initData[index] }
          : { ...item }
      );
    } else if (typeof initData === "object") {
      const configFields = new Set(config.config.map(item => item.field));
      
      processedConfig.config = config.config.map(configItem => {
        const key = configItem.field;
        if (initData.hasOwnProperty(key)) {
          return { ...configItem, ...initData[key] };
        }
        return configItem;
      });
      
      Object.keys(initData).forEach(key => {
        if (!configFields.has(key)) {
          extraData[key] = initData[key];
        }
      });
    }
  }

  return { processedConfig, extraData };
}


  /**
   * 渲染组件
   */
  async render() {
    console.log('render')
    this.formInputs.clear();
    this.properties.formData = this.properties.formData || {};

    this.properties.show = this.getProp('show');
    this.properties.config = this.getProp('config');
    this.properties.initData = this.getProp('initData');
    this.properties.modalName = this.getProp('modalName');

    const Modalconfig = await getModalConfig(this.properties.modalName);
    if (Modalconfig && Modalconfig.config) {
      this.properties.config = { ...Modalconfig };

    }

    const { processedConfig, extraData } = await this.processBeforeShow(this.properties.config);
    console.log(processedConfig)
    // 将额外数据合并到表单数据中
    const newFormData = {
      ...this.properties.formData,
      ...extraData
    };

    this.processedConfig = processedConfig;
    this.properties.formData = newFormData;

    this.container.innerHTML = `
      <div class="custom-form-modal-overlay" style="display: none;">
        <div class="custom-form-modal">
          <div class="modal-header">
            <h3 class="modal-title">${this.processedConfig.title || this.properties.config.title|| this.properties.title}</h3>
            <button class="btn-close" type="button" aria-label="关闭">&times;</button>
          </div>
          
          <div class="form-content">
            <table class="form-container">
            </table>
          </div>
          
          <div class="modal-footer">
            ${this.renderFooterButtons()}
          </div>
        </div>
      </div>
    `;

    const container = this.container.querySelector(".form-container");
    if (this.processedConfig.config && Array.isArray(this.processedConfig.config)) {
      this.processedConfig.config.forEach(field => {
        const row = this.generateRow(field);
        container.appendChild(row);
      });
    }

    // 事件绑定
    this.bindEvents();

    // 返回Promise以支持异步操作
    return Promise.resolve();
  }



  // 事件绑定
  bindEvents() {
    // 关闭弹窗 - X按钮
    const closeBtn = this.shadowRoot.querySelector('.btn-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.close();
      });
      // 添加触摸事件支持
      closeBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.close();
      });
    }
    
    // 处理动态生成的按钮事件
    const modalFooter = this.shadowRoot.querySelector('.modal-footer');
    if (modalFooter) {
      modalFooter.addEventListener('click', async (e) => {
        if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
          const button = e.target.tagName === 'BUTTON' ? e.target : e.target.closest('button');
          const key = button.dataset.key;
          
          // 获取按钮配置
          const buttonsConfig = this.processedConfig.buttons || [
            { key: 'cancel', text: '取消', className: 'btn btn-cancel', action: 'close' },
            { key: 'submit', text: '提交', className: 'btn btn-submit', action: 'submit' }
          ];
          
          const buttonConfig = buttonsConfig.find(b => b.key === key);
          
          // 根据按钮配置执行相应操作
          if (buttonConfig) {
            if (buttonConfig.action === 'close') {
              this.close();
            } else if (buttonConfig.action === 'submit') {
              this.submitForm();
            } else if (typeof buttonConfig.onClick === 'function') {
              buttonConfig.onClick(this.properties.formData);
            }
          }
        }
      });
      
      // 添加触摸事件支持
      modalFooter.addEventListener('touchstart', async (e) => {
        if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
          e.preventDefault();
          const button = e.target.tagName === 'BUTTON' ? e.target : e.target.closest('button');
          const key = button.dataset.key;
          
          // 获取按钮配置
          const buttonsConfig = this.processedConfig.buttons || [
            { key: 'cancel', text: '取消', className: 'btn btn-cancel', action: 'close' },
            { key: 'submit', text: '提交', className: 'btn btn-submit', action: 'submit' }
          ];
          
          const buttonConfig = buttonsConfig.find(b => b.key === key);
          
          // 根据按钮配置执行相应操作
          if (buttonConfig) {
            if (buttonConfig.action === 'close') {
              this.close();
            } else if (buttonConfig.action === 'submit') {
              this.submitForm();
            } else if (typeof buttonConfig.onClick === 'function') {
              buttonConfig.onClick(this.properties.formData);
            }
          }
        }
      });
    }
    
    // 添加移动端键盘事件处理，监听Enter键提交
    const formInputs = this.shadowRoot.querySelectorAll('.form-input');
    formInputs.forEach(input => {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          // 找到当前输入框在表单中的下一个输入元素
          let nextInput = input.nextElementSibling;
          while (nextInput && !nextInput.classList.contains('form-input')) {
            nextInput = nextInput.nextElementSibling;
          }
          
          if (nextInput) {
            nextInput.focus();
            e.preventDefault();
          } else {
            // 如果是最后一个输入框，尝试提交表单
            this.submitForm();
            e.preventDefault();
          }
        }
      });
    })

    // 点击遮罩层关闭
    const overlay = this.shadowRoot.querySelector('.custom-form-modal-overlay');
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.close();
        }
      });
    }
  }

  async submitForm() {
    // 收集表单数据
    this.collectFormData();

    const errors = this.validateForm(); // 验证表单

    if (errors && errors.length > 0) { // 错误信息
      alert(errors.join('\n')); // 提示错误信息    
      return; // 验证失败
    }

    try {
      if (this.processedConfig.onSubmit && typeof this.processedConfig.onSubmit === 'function') {
        const data = await this.processedConfig.onSubmit(this.properties.formData); // 调用提交方法
        if(data && this._resolvePromise){
          this._resolvePromise(data);
          this._resolvePromise=null;
          this._rejectPromise=null;
        }
      } else {
        this.triggerEvent('submit', this.properties.formData);
      }
      this.close(); // 关闭弹窗
    } catch (error) {
      console.error('提交表单时出错:', error);
      if (this._rejectPromise) {
        this._rejectPromise(error);
        this._rejectPromise = null;
        this._resolvePromise = null;
      }
    }
  }

  // 收集表单数据
  collectFormData() {
    this.formInputs.forEach((input, fieldName) => {
      if (input) {
        let value;
        // 处理多选框组
        if (input.className && input.className.includes('checkbox-group')) {
          const checkboxes = input.querySelectorAll(`input[type="checkbox"]:checked`);
          value = Array.from(checkboxes).map(cb => cb.value);
        }
        // 处理复选框容器
        else if (input.querySelector && input.querySelector('input[type="checkbox"]') && !input.className.includes('checkbox-group')) {
          const checkbox = input.querySelector('input[type="checkbox"]');
          value = checkbox.checked;
        } else if (input.type === 'checkbox') {
          value = input.checked;
        } else if (input.type === 'number') {
          value = parseFloat(input.value) || 0;
        } else if (input.multiple) { // 多选框
          const selectedOptions = Array.from(input.selectedOptions);
          value = selectedOptions.map(opt => opt.value);
        } else {
          value = input.value;
        }
        this.properties.formData[fieldName] = value;
      }
    });
  }

  // 触发自定义事件
  triggerEvent(eventName, data) {
    const event = new CustomEvent(eventName, {
      detail: data,
      bubbles: true,
      cancelable: true
    });
    this.dispatchEvent(event);
  }


  validateForm() {
    const errors = [];
    this.processedConfig.config.forEach(conf => {
      const value = this.properties.formData[conf.field];

      // 必填校验
      if (conf.required && (value === undefined || value === null || value === '')) {
        errors.push(`${conf.title} 不能为空！`);
        return;
      }

      // 自定义验证逻辑
      if (conf.verify) {
        if (typeof conf.verify === 'function') {
          const result = conf.verify(value);
          if (result !== true) {
            errors.push(result || `${conf.title} 验证失败`);
          }
        }
        else if (typeof conf.verify === 'string') {
          const regex = new RegExp(conf.verify);
          if (!regex.test(value)) {
            errors.push(`${conf.title} 格式错误`);
          }
        }
      }
    });
    return errors;
  }

  /**
 * 生成表单行
 */
  generateRow(config) {
    const row = document.createElement('tr');
    row.className = `${config.field}-row`;

    // 标签单元格
    const labelCell = document.createElement('td');
    labelCell.innerHTML = `<label class="form-label">${config.title}${config.required ? '*' : ''}</label>`;
    labelCell.style.width = '15%';
    // 响应式样式类
    labelCell.className = 'label-cell';
    row.appendChild(labelCell);

    // 输入单元格
    const inputCell = document.createElement('td');
    inputCell.className = `${config.field}-cell input-wrapper`;
    // 响应式样式类
    inputCell.className = 'input-cell';

    // 获取初始值（优先使用formData中的值）
    const initialValue = this.properties.formData[config.field] ?? config.value;
    
    // 为移动设备优化点击区域和触摸体验
    const enhanceMobileExperience = (element) => {
      if (element && !element.hasAttribute('data-mobile-enhanced')) {
        // 增加点击区域大小
        if (element.tagName === 'INPUT' || element.tagName === 'SELECT' || element.tagName === 'TEXTAREA') {
          element.style.minHeight = '44px'; // iOS推荐的最小可点击区域高度
          element.style.fontSize = '16px'; // 防止iOS自动缩放
          element.style.touchAction = 'manipulation'; // 禁用双击缩放
        }
        element.setAttribute('data-mobile-enhanced', 'true');
      }
    };

    // 根据类型创建输入元素
    let inputElement;
    switch (config.type) {
      case 'text':
        inputElement = document.createElement('input');
        inputElement.type = 'text';
        inputElement.value = initialValue || '';
        // 禁用浏览器快捷输入功能
        inputElement.autocomplete = config.autocomplete || 'off';
        inputElement.spellcheck = config.spellcheck !== undefined ? config.spellcheck : false;
        inputElement.autocorrect = 'off';
        inputElement.autocapitalize = 'off';
        break;

      case 'number':
        inputElement = document.createElement('input');
        inputElement.type = 'number';
        inputElement.value = initialValue || 0;
        inputElement.min = config.min || -10000;
        inputElement.max = config.max || 100000;
        inputElement.step = config.step || 1;
        // 禁用浏览器快捷输入功能
        inputElement.autocomplete = 'off';
        break;
      case 'date':
        inputElement = document.createElement('input');
        inputElement.type = 'date';
        inputElement.value = initialValue || '';
        // 禁用浏览器快捷输入功能
        inputElement.autocomplete = 'off';
        break;
      case 'textarea':
        inputElement = document.createElement('textarea');
        inputElement.value = initialValue || '';
        inputElement.rows = config.rows || 3;
        // 禁用浏览器快捷输入功能
        inputElement.autocomplete = config.autocomplete || 'off';
        inputElement.spellcheck = config.spellcheck !== undefined ? config.spellcheck : false;
        inputElement.autocorrect = 'off';
        inputElement.autocapitalize = 'off';
        
        // 应用移动设备优化
        enhanceMobileExperience(inputElement);
        
        break;

      case 'checkbox':
        inputElement = document.createElement('input');
        inputElement.type = 'checkbox';
        inputElement.checked = Boolean(initialValue);
        
        // 应用移动设备优化
        enhanceMobileExperience(inputElement);
        
        // 添加标签显示
        const checkboxContainer = document.createElement('div');
        checkboxContainer.style.display = 'flex';
        checkboxContainer.style.alignItems = 'center';
        
        const checkLabel = document.createElement('label');
        checkLabel.textContent = config.label || '';
        checkLabel.style.marginLeft = '8px';
        checkLabel.style.cursor = 'pointer';
        
        checkboxContainer.appendChild(inputElement);
        checkboxContainer.appendChild(checkLabel);
        
        // 将容器添加到输入单元格
        inputCell.appendChild(checkboxContainer);
        // 不需要移除inputElement，因为它已经在checkboxContainer内
        inputElement = checkboxContainer;
        break;
        
      case 'checkbox-group':
        // 创建多选框组容器
        inputElement = document.createElement('div');
        inputElement.className = 'checkbox-group';
        
        // 处理初始值，确保是数组
        const checkboxValues = Array.isArray(initialValue) ? initialValue : (initialValue ? [initialValue] : []);
        
        config.options?.forEach(option => {
          const optionContainer = document.createElement('div');
          optionContainer.className = 'checkbox-option';
          
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.value = option.value;
          checkbox.checked = checkboxValues.includes(option.value);
          checkbox.setAttribute('data-field', config.field);
          // 禁用浏览器快捷输入功能
          checkbox.autocomplete = 'off';
          
          // 应用移动设备优化
          enhanceMobileExperience(checkbox);
          
          const label = document.createElement('label');
          label.textContent = option.label;
          label.htmlFor = `${config.field}-${option.value}`;
          
          checkbox.id = `${config.field}-${option.value}`;
          
          optionContainer.appendChild(checkbox);
          optionContainer.appendChild(label);
          inputElement.appendChild(optionContainer);
        });
        
        // 添加事件监听器
        inputElement.addEventListener('change', (e) => {
          if (e.target.type === 'checkbox' && e.target.getAttribute('data-field') === config.field) {
            // 获取所有选中的值
            const checkboxes = inputElement.querySelectorAll(`input[type="checkbox"][data-field="${config.field}"]:checked`);
            const values = Array.from(checkboxes).map(cb => cb.value);
            this.onInputChange(config.field, values, 'checkbox-group');
          }
        });
        
        // 只读支持
        if (config.readonly) {
          const checkboxes = inputElement.querySelectorAll('input[type="checkbox"]');
          checkboxes.forEach(checkbox => {
            checkbox.disabled = true;
            checkbox.style.cursor = 'not-allowed';
          });
        }
        break;

      case 'radio':
        // 创建单选按钮组
        inputElement = document.createElement('div');
        config.options.forEach(option => {
          const radio = document.createElement('input');
          radio.type = 'radio';
          radio.name = config.field;
          radio.value = option.value;
          radio.checked = (option.value === initialValue);
          // 禁用浏览器快捷输入功能
          radio.autocomplete = 'off';
          
          // 应用移动设备优化
          enhanceMobileExperience(radio);

          const label = document.createElement('label');
          label.textContent = option.label;
          label.style.padding = '8px 0'; // 增加点击区域

          inputElement.appendChild(radio);
          inputElement.appendChild(label);
        });
        break;

      case 'select':
        inputElement = document.createElement('select');
        
        // 应用移动设备优化
        enhanceMobileExperience(inputElement);
        
        config.options?.forEach(option => {
          const optionElement = document.createElement('option');
          optionElement.value = option.value;
          optionElement.textContent = option.label;
          optionElement.selected = (option.value === initialValue);
          inputElement.appendChild(optionElement);
        });
        break;

      case 'select2':
        inputElement = document.createElement('select');
        // 首先隐藏原生下拉框
        inputElement.style.display = 'none'; // 新增：初始隐藏原生下拉

        config.options?.forEach(option => {
          const optionElement = document.createElement('option');
          optionElement.value = option.value;
          optionElement.textContent = option.label;
          optionElement.selected = (option.value === initialValue);
          inputElement.appendChild(optionElement);
        });

        inputElement.classList.add('form-control');
        inputElement.setAttribute('data-placeholder', config.placeholder || '请选择');
        if (config.allowClear !== false) {
          inputElement.setAttribute('data-allow-clear', 'true');
        }


        // 延迟初始化 select2
        setTimeout(() => {
          if (window.$ && window.$.fn.select2) {
            const $select = $(inputElement);
            const modalElement = this.shadowRoot.querySelector('custom-form-modal');
 const rect = inputCell.offsetWidth;
              console.log(rect);
            const select2Options = {
              theme: 'bootstrap',
              placeholder: config.placeholder || '请选择',
              allowClear: config.allowClear !== false,
              width: rect+'px',
              // 关键：确保下拉菜单在模态框内正确显示
             
            };

            if (config.select2Options) {
              Object.assign(select2Options, config.select2Options);
            }

            $select.select2(select2Options);

            // 修复：手动触发一次渲染
            $select.trigger('change.select2');
          
            $select.on('change', (e) => {
              this.onInputChange(config.field, e.target.value, config.type);
            });
           
          } else {
            // 如果 Select2 不可用，显示原始 select
            inputElement.style.display = '';
            console.warn('Select2 library not found. Falling back to regular select.');
          }
        }, 100);

        break;

      case 'multiSelect':
        inputElement = document.createElement('select');
        inputElement.multiple = true;
        const selectedValues = Array.isArray(initialValue)
          ? initialValue
          : [initialValue];

        config.options?.forEach(option => {
          const optionElement = document.createElement('option');
          optionElement.value = option.value;
          optionElement.textContent = option.label;
          optionElement.selected = selectedValues.includes(option.value);
          inputElement.appendChild(optionElement);
        });
        break;

      default:
        inputElement = document.createElement('input');
        inputElement.type = 'text';
        inputElement.value = initialValue || '';
        
        // 应用移动设备优化
        enhanceMobileExperience(inputElement);
    }

    // 添加公共属性
    if (inputElement instanceof HTMLInputElement ||
      inputElement instanceof HTMLSelectElement ||
      inputElement instanceof HTMLTextAreaElement) {
      inputElement.name = config.field;
      inputElement.classList.add('form-input', `form-input-${config.type}`);
      inputElement.placeholder = config.placeholder || '';

      // 添加只读属性支持
      if (config.readonly) {
        inputElement.readOnly = true;
        inputElement.style.backgroundColor = '#f8f9fa';
        inputElement.style.cursor = 'not-allowed';
      }
      
      // 为其他可能的输入类型添加浏览器快捷输入禁用属性
      if (inputElement.tagName === 'INPUT' || inputElement.tagName === 'TEXTAREA') {
        // 如果未设置，使用默认值
        if (inputElement.type !== 'number' && inputElement.type !== 'date' && !inputElement.autocomplete) {
          inputElement.autocomplete = config.autocomplete || 'off';
        }
        // 特殊处理密码输入框
        if (inputElement.type === 'password') {
          inputElement.autocomplete = config.autocomplete || 'new-password';
        }
        // 移动端优化属性
        if (inputElement.type !== 'checkbox' && inputElement.type !== 'radio' && inputElement.type !== 'number' && inputElement.type !== 'date') {
          if (!inputElement.hasAttribute('autocorrect')) inputElement.autocorrect = 'off';
          if (!inputElement.hasAttribute('autocapitalize')) inputElement.autocapitalize = 'off';
        }
      }

      // 添加变更事件监听
      inputElement.addEventListener('change', (e) => {
        this.onInputChange(config.field, e.target.value, config.type);
      });
    }

    inputCell.appendChild(inputElement);
    row.appendChild(inputCell);
inputCell.style.width = '60%';
    // 按钮单元格
    const buttonCell = document.createElement('td');
    if (config.button) {
      
      const button = document.createElement('button');
      button.textContent = config.button.text;
      button.classList.add('form-button');
      button.addEventListener('click', () => this.onButtonClick(config.button));
      buttonCell.appendChild(button);
    }
    row.appendChild(buttonCell);

    // 存储输入元素引用
    this.formInputs.set(config.field, inputElement);

    return row;
  }

  /**
   * 输入变化处理
   */
  onInputChange(field, value, type) {
    // 更新表单数据
    if (type === 'checkbox') {
      // 处理传入的值或直接从DOM获取
      if (value !== undefined) {
        this.properties.formData[field] = value;
      } else {
        const inputElement = this.formInputs.get(field);
        if (inputElement && inputElement.querySelector) {
          const checkbox = inputElement.querySelector('input[type="checkbox"]');
          this.properties.formData[field] = checkbox ? checkbox.checked : false;
        } else if (inputElement) {
          this.properties.formData[field] = inputElement.checked || false;
        }
      }
    } else if (type === 'checkbox-group') {
      // 处理多选框组值
      this.properties.formData[field] = value;
    } else if (type === 'multiSelect') {
      // 处理多选值
      const selectElement = this.formInputs.get(field);
      if (selectElement && selectElement.selectedOptions) {
        const selectedOptions = Array.from(selectElement.selectedOptions);
        this.properties.formData[field] = selectedOptions.map(opt => opt.value);
      }
    } else if (type === 'radio') {
      // 处理单选按钮组
      const radioContainer = this.formInputs.get(field);
      if (radioContainer) {
        const checkedRadio = radioContainer.querySelector('input[type="radio"]:checked');
        this.properties.formData[field] = checkedRadio ? checkedRadio.value : '';
      }
    } else {
      this.properties.formData[field] = value;
    }

    // 执行自定义onChange
    const config = this.processedConfig.config ? this.processedConfig.config.find(c => c.field === field) : null;
    if (config && typeof config.onChange === 'function') {
      config.onChange(value, field, this.properties.formData);
    }
  }

  

  // 检查弹窗是否已打开
  isOpen() {
    const overlay = this.shadowRoot.querySelector('.custom-form-modal-overlay');
    return overlay && overlay.style.display === 'flex';
  }

  //属性获取方法
  getProp(propName) {
    const configAttr = this.getAttribute(propName)
    if (configAttr) {

      switch (propName) {
        case 'config':
          return JSON.parse(configAttr);
        case 'initData':
          try {
                    
          return JSON.parse(configAttr);
          } catch (error) {
                    
          return configAttr;
          }

        default:
          return configAttr;
      }
    }
    return;
  }
  // 按钮点击事件
  onButtonClick(buttonConfig) {
    console.log(buttonConfig);
    if (buttonConfig.childModal) {
      // 保存当前完整的弹窗状态作为父级弹窗数据
      const currentState = {
        title: this.properties.title,
        config: this.properties.config,
        formData: { ...this.properties.formData },
        modalName: this.properties.modalName,
        initData: this.properties.initData,
        popoverData: this.properties.popoverData
      };
      
      console.log('保存父级弹窗状态:', currentState);
      
      if (typeof buttonConfig.childModal === 'object') {
        // 设置子弹窗的配置，并保存父级状态
        this.properties.config = buttonConfig.childModal;
        this.properties.popoverData = currentState;
        this.setAttribute("config", JSON.stringify(buttonConfig.childModal));
        this.render().then(() => {
          setTimeout(() => this.open(), 50);
        });
        return;
      } else {
        // 设置子弹窗的modalName，并保存父级状态
        this.properties.modalName = buttonConfig.childModal;
        this.properties.popoverData = currentState;
        this.setAttribute("modalName", buttonConfig.childModal);
        this.render().then(() => {
          setTimeout(() => this.open(), 50);
        });
        return;
      }
    }
    if (buttonConfig.onClick && typeof buttonConfig.onClick === 'function') {
      buttonConfig.onClick(this.properties.formData);
    }
  }

  /** 
   * 设置属性
   */
  setProp(propName, propValue) {
    this.properties[propName] = propValue;
    console.log(propName);
    if (typeof propValue === 'object') {
      this.setAttribute(propName, JSON.stringify(propValue));
    } else {
      this.setAttribute(propName, propValue);
    }
    this.render().then(() => {
      // 如果弹窗之前是打开的，重新渲染后保持打开状态
      if (this.properties.popoverData && Object.keys(this.properties.popoverData).length > 0) {
        setTimeout(() => this.open(), 50);
      }
    });
  }
  setModalName(modalName,initData) {
    this.properties.modalName = modalName;  
    this.setAttribute("modalName", modalName);
    this.properties.initData = initData;
    this.setAttribute("initData", JSON.stringify(initData));

  
    // 返回一个 Promise，在关闭或提交完成后解析
    return new Promise((resolve, reject) => {
      this._resolvePromise = resolve;
      this._rejectPromise = reject;
      
      this.render();
      setTimeout(() => this.open(), 50);
    });
  }
  setConfig(config) {

    this.properties.config = config;  
    this.setAttribute("config", config);
  this.render()
  setTimeout(() => this.open(), 50);
  }
  // 渲染底部按钮
  renderFooterButtons() {
    // 默认按钮配置
    const defaultButtons = [
      { key: 'cancel', text: '取消', className: 'btn btn-cancel', action: 'close' },
      { key: 'submit', text: '提交', className: 'btn btn-submit', action: 'submit' }
    ];
    
    // 从配置中获取按钮配置，如果没有则使用默认按钮
    const buttonsConfig = this.processedConfig.buttons || defaultButtons;
    
    // 生成按钮HTML
    return buttonsConfig.map(button => `
      <button 
        class="${button.className || 'btn'}" 
        type="button" 
        data-key="${button.key}"
        ${button.disabled ? 'disabled' : ''}
      >
        ${button.text}
      </button>
    `).join('');
  }
  
  // 清理 select2 实例
  cleanupSelect2() {
    if (window.$ && window.$.fn.select2) {
      this.formInputs.forEach((input, fieldName) => {
        if (input && input.tagName === 'SELECT') {
          const $select = $(input);
          if ($select.hasClass('select2-hidden-accessible')) {
            $select.select2('destroy');
          }
        }
      });
    }
  }

}

customElements.define('custom-form-modal', CustomFormModal);
