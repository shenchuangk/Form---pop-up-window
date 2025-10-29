/**
 * 自定义表单弹窗渲染方法
 * 负责生成各种表单元素和渲染逻辑
 */
import { enhanceMobileExperience, evaluateMathExpression } from './custom-form-modal-utils.js';

/**
 * 生成表单行
 * @param {Object} config - 字段配置
 * @param {Object} formData - 表单数据
 * @param {Map} formInputs - 表单输入元素映射
 * @param {Function} onInputChange - 输入变化回调
 * @returns {HTMLElement} - 生成的表格行元素
 */
export function generateRow(config, formData, formInputs, onInputChange, onButtonClick) {
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
  const initialValue = formData[config.field] ?? config.value;

  // 根据类型创建输入元素
  let inputElement = createInputElement(config, initialValue, onInputChange);

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
      onInputChange(config.field, e.target.value, config.type);
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
    button.addEventListener('click', () => onButtonClick(config.button));
    buttonCell.appendChild(button);
  }
  row.appendChild(buttonCell);

  // 存储输入元素引用
  formInputs.set(config.field, inputElement);

  return row;
}

/**
 * 根据类型创建输入元素
 * @param {Object} config - 字段配置
 * @param {*} initialValue - 初始值
 * @param {Function} onInputChange - 输入变化回调
 * @returns {HTMLElement} - 创建的输入元素
 */
function createInputElement(config, initialValue, onInputChange) {
  switch (config.type) {
    case 'text':
      return createTextInput(config, initialValue);
    case 'number':
      return createNumberInput(config, initialValue);
    case 'date':
      return createDateInput(config, initialValue);
    case 'textarea':
      return createTextarea(config, initialValue);
    case 'checkbox':
      return createCheckbox(config, initialValue);
    case 'checkbox-group':
      return createCheckboxGroup(config, initialValue, onInputChange);
    case 'radio':
      return createRadioGroup(config, initialValue);
    case 'select':
      return createSelect(config, initialValue);
    case 'select2':
      return createSelect2(config, initialValue, onInputChange);
    case 'multiSelect':
      return createMultiSelect(config, initialValue);
    default:
      const defaultInput = document.createElement('input');
      defaultInput.type = 'text';
      defaultInput.value = initialValue || '';
      enhanceMobileExperience(defaultInput);
      return defaultInput;
  }
}

/**
 * 创建文本输入框
 */
function createTextInput(config, initialValue) {
  const input = document.createElement('input');
  input.type = 'text';
  input.value = initialValue || '';
  // 禁用浏览器快捷输入功能
  input.autocomplete = config.autocomplete || 'off';
  input.spellcheck = config.spellcheck !== undefined ? config.spellcheck : false;
  input.autocorrect = 'off';
  input.autocapitalize = 'off';
  return input;
}

/**
 * 创建数字输入框（支持数学公式）
 */
function createNumberInput(config, initialValue) {
  const input = document.createElement('input');
  input.type = 'text'; // 改为text类型以支持输入公式
  input.setAttribute('inputmode', 'decimal'); // 移动端显示数字键盘
  input.value = initialValue || 0;
  
  // 添加提示文本
  input.title = '支持数学公式计算，如：2+3*4、(5+2)/3';
  
  // 添加样式提示
  input.classList.add('math-enabled');
  
  // 禁用浏览器快捷输入功能
  input.autocomplete = 'off';
  
  // 添加实时计算提示
  input.addEventListener('input', (e) => {
    const value = e.target.value;
    if (value && /[+\-*/()]/.test(value)) {
      try {
        const result = evaluateMathExpression(value);
        if (typeof result === 'number' && !isNaN(result)) {
          // 可以在这里添加一个临时提示，显示计算结果
          e.target.setAttribute('data-result', result);
        }
      } catch (error) {
        // 忽略计算错误
      }
    }
  });
  
  enhanceMobileExperience(input);
  return input;
}

/**
 * 创建日期输入框
 */
function createDateInput(config, initialValue) {
  const input = document.createElement('input');
  input.type = 'date';
  input.value = initialValue || '';
  // 禁用浏览器快捷输入功能
  input.autocomplete = 'off';
  enhanceMobileExperience(input);
  return input;
}

/**
 * 创建文本域
 */
function createTextarea(config, initialValue) {
  const textarea = document.createElement('textarea');
  textarea.value = initialValue || '';
  textarea.rows = config.rows || 3;
  // 禁用浏览器快捷输入功能
  textarea.autocomplete = config.autocomplete || 'off';
  textarea.spellcheck = config.spellcheck !== undefined ? config.spellcheck : false;
  textarea.autocorrect = 'off';
  textarea.autocapitalize = 'off';
  
  enhanceMobileExperience(textarea);
  return textarea;
}

/**
 * 创建复选框
 */
function createCheckbox(config, initialValue) {
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = Boolean(initialValue);
  
  enhanceMobileExperience(checkbox);
  
  // 添加标签显示
  const checkboxContainer = document.createElement('div');
  checkboxContainer.style.display = 'flex';
  checkboxContainer.style.alignItems = 'center';
  
  const checkLabel = document.createElement('label');
  checkLabel.textContent = config.label || '';
  checkLabel.style.marginLeft = '8px';
  checkLabel.style.cursor = 'pointer';
  
  checkboxContainer.appendChild(checkbox);
  checkboxContainer.appendChild(checkLabel);
  
  return checkboxContainer;
}

/**
 * 创建多选框组
 */
function createCheckboxGroup(config, initialValue, onInputChange) {
  // 创建多选框组容器
  const container = document.createElement('div');
  container.className = 'checkbox-group';
  
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
    
    enhanceMobileExperience(checkbox);
    
    const label = document.createElement('label');
    label.textContent = option.label;
    label.htmlFor = `${config.field}-${option.value}`;
    
    checkbox.id = `${config.field}-${option.value}`;
    
    optionContainer.appendChild(checkbox);
    optionContainer.appendChild(label);
    container.appendChild(optionContainer);
  });
  
  // 添加事件监听器
  container.addEventListener('change', (e) => {
    if (e.target.type === 'checkbox' && e.target.getAttribute('data-field') === config.field) {
      // 获取所有选中的值
      const checkboxes = container.querySelectorAll(`input[type="checkbox"][data-field="${config.field}"]:checked`);
      const values = Array.from(checkboxes).map(cb => cb.value);
      onInputChange(config.field, values, 'checkbox-group');
    }
  });
  
  // 只读支持
  if (config.readonly) {
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      checkbox.disabled = true;
      checkbox.style.cursor = 'not-allowed';
    });
  }
  
  return container;
}

/**
 * 创建单选按钮组
 */
function createRadioGroup(config, initialValue) {
  // 创建单选按钮组
  const container = document.createElement('div');
  config.options.forEach(option => {
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = config.field;
    radio.value = option.value;
    radio.checked = (option.value === initialValue);
    // 禁用浏览器快捷输入功能
    radio.autocomplete = 'off';
    
    enhanceMobileExperience(radio);

    const label = document.createElement('label');
    label.textContent = option.label;
    label.style.padding = '8px 0'; // 增加点击区域

    container.appendChild(radio);
    container.appendChild(label);
  });
  return container;
}

/**
 * 创建下拉选择框
 */
function createSelect(config, initialValue) {
  const select = document.createElement('select');
  
  enhanceMobileExperience(select);
  
  config.options?.forEach(option => {
    const optionElement = document.createElement('option');
    optionElement.value = option.value;
    optionElement.textContent = option.label;
    optionElement.selected = (option.value === initialValue);
    select.appendChild(optionElement);
  });
  return select;
}

/**
 * 创建Select2下拉选择框
 */
function createSelect2(config, initialValue, onInputChange) {
  const select = document.createElement('select');
  // 首先隐藏原生下拉框
  select.style.display = 'none'; // 新增：初始隐藏原生下拉

  config.options?.forEach(option => {
    const optionElement = document.createElement('option');
    optionElement.value = option.value;
    optionElement.textContent = option.label;
    optionElement.selected = (option.value === initialValue);
    select.appendChild(optionElement);
  });

  select.classList.add('form-control');
  select.setAttribute('data-placeholder', config.placeholder || '请选择');
  if (config.allowClear !== false) {
    select.setAttribute('data-allow-clear', 'true');
  }

  // 延迟初始化 select2
  setTimeout(() => {
    if (window.$ && window.$.fn.select2) {
      const $select = $(select);
      const rect = select.parentElement.offsetWidth;
      
      const select2Options = {
        theme: 'bootstrap',
        placeholder: config.placeholder || '请选择',
        allowClear: config.allowClear !== false,
        width: rect+'px',
      };

      if (config.select2Options) {
        Object.assign(select2Options, config.select2Options);
      }

      $select.select2(select2Options);

      // 修复：手动触发一次渲染
      $select.trigger('change.select2');
    
      $select.on('change', (e) => {
        onInputChange(config.field, e.target.value, config.type);
      });
      
    } else {
      // 如果 Select2 不可用，显示原始 select
      select.style.display = '';
      console.warn('Select2 library not found. Falling back to regular select.');
    }
  }, 100);

  return select;
}

/**
 * 创建多选下拉框
 */
function createMultiSelect(config, initialValue) {
  const select = document.createElement('select');
  select.multiple = true;
  const selectedValues = Array.isArray(initialValue)
    ? initialValue
    : [initialValue];

  config.options?.forEach(option => {
    const optionElement = document.createElement('option');
    optionElement.value = option.value;
    optionElement.textContent = option.label;
    optionElement.selected = selectedValues.includes(option.value);
    select.appendChild(optionElement);
  });
  
  enhanceMobileExperience(select);
  return select;
}

/**
 * 渲染底部按钮
 * @param {Array} buttonsConfig - 按钮配置数组
 * @returns {string} - 按钮HTML字符串
 */
export function renderFooterButtons(buttonsConfig) {
  // 默认按钮配置
  const defaultButtons = [
    { key: 'cancel', text: '取消', className: 'btn btn-cancel', action: 'close' },
    { key: 'submit', text: '提交', className: 'btn btn-submit', action: 'submit' }
  ];
  
  // 使用提供的按钮配置或默认按钮
  const buttons = buttonsConfig || defaultButtons;
  
  // 生成按钮HTML
  return buttons.map(button => `
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
