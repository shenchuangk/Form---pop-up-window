/**
 * 自定义表单弹窗组件
 * 提供灵活的表单配置和交互功能
 */
import { registerModal, getModalConfig } from '../modal-registry/modal-registry.js';
import { evaluateMathExpression, triggerEvent, REGEX_PATTERNS, isValidIDCard } from './custom-form-modal-utils.js';
import { generateRow, renderFooterButtons } from './custom-form-modal-render.js';

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
      const response1 = await fetch('./assets/css/select2.min.css');
      const response2 = await fetch('./assets/css/select2-bootstrap.min.css');

      let css = await response.text();
      css += await response1.text();
      css += await response2.text();
      
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
    console.log(this.properties.popoverData);

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
            
            // 深拷贝父级弹窗的表单数据，确保不丢失任何输入内容
            const formDataCopy = JSON.parse(JSON.stringify(parentModal.formData || {}));
            
            // 完全重置为父级弹窗的状态
            this.properties = {
              show: false,
              title: parentModal.title || '自定义窗口',
              config: JSON.parse(JSON.stringify(parentModal.config || [])),
              formData: formDataCopy,
              modalName: parentModal.modalName || '',
              initData: JSON.parse(JSON.stringify(parentModal.initData || null)),
              popoverData: JSON.parse(JSON.stringify(parentModal.popoverData || {}))
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
              
              // 确保表单数据正确应用到表单元素
              // 等待渲染完成后，手动重新初始化select2组件
              setTimeout(() => {
                // 对于select2组件，确保它们被正确初始化
                if (window.$ && window.$.fn.select2) {
                  this.formInputs.forEach((input, fieldName) => {
                    if (input && input.tagName === 'SELECT') {
                      // 先销毁可能存在的旧实例
                      const $select = $(input);
                      if ($select.hasClass('select2-hidden-accessible')) {
                        $select.select2('destroy');
                      }
                      
                      // 检查该select是否应该是select2类型
                      const fieldConfig = this.processedConfig.config.find(config => config.field === fieldName);
                      if (fieldConfig && fieldConfig.type === 'select2') {
                        // 重新初始化select2
                        const select2Options = {
                          theme: 'bootstrap',
                          placeholder: fieldConfig.placeholder || '请选择',
                          allowClear: fieldConfig.allowClear !== false,
                          width: $(input).parent().width() + 'px'
                        };
                        
                        if (fieldConfig.select2Options) {
                          Object.assign(select2Options, fieldConfig.select2Options);
                        }
                        
                        $select.select2(select2Options);
                        
                        // 应用保存的值
                        if (this.properties.formData[fieldName] !== undefined) {
                          $select.val(this.properties.formData[fieldName]);
                          $select.trigger('change.select2');
                        }
                      }
                    }
                  });
                }
                
                this.open();
              }, 100);
            }).catch(error => {
              console.error('恢复父级弹窗失败:', error);
            });
          }, 100);
        } else {
          // 没有父级弹窗时，重置表单数据以避免下次打开时显示旧数据
          this.properties.formData = {};
          this.processedConfig = {};
          this.formInputs.clear();
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
   * 处理弹窗显示前的数据
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
    console.log('render');
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
    console.log(processedConfig);
    // 将额外数据合并到表单数据中
    const newFormData = {
      ...this.properties.formData,
      ...extraData
    };

    // 合并processedConfig中config项的值到formData
    if (processedConfig.config && Array.isArray(processedConfig.config)) {
      processedConfig.config.forEach(configItem => {
        // 直接使用config.value，确保父级保存的数据能够正确应用
        if (configItem.value !== undefined) {
          newFormData[configItem.field] = configItem.value;
        }
      });
    }

    this.processedConfig = processedConfig;
    this.properties.formData = newFormData;

    this.container.innerHTML = `
      <div class="custom-form-modal-overlay" style="display: none;">
        <div class="custom-form-modal">
          <div class="modal-header">
            <h3 class="modal-title">${this.processedConfig.title || this.properties.config.title || this.properties.title}</h3>
            <button class="btn-close" type="button" aria-label="关闭">&times;</button>
          </div>
          
          <div class="form-content">
            <table class="form-container">
            </table>
          </div>
          
          <div class="modal-footer">
            ${renderFooterButtons(this.processedConfig.buttons)}
          </div>
        </div>
      </div>
    `;

    const container = this.container.querySelector(".form-container");
    if (this.processedConfig.config && Array.isArray(this.processedConfig.config)) {
      this.processedConfig.config.forEach(field => {
        const row = generateRow(field, this.properties.formData, this.formInputs, 
          (field, value, type) => this.onInputChange(field, value, type),
          (buttonConfig) => this.onButtonClick(buttonConfig)
        );
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
    });

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
        triggerEvent(this, 'submit', this.properties.formData);
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
        } else if (input.classList && input.classList.contains('math-enabled')) {
          // 支持数学公式计算
          value = evaluateMathExpression(input.value);
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

  validateForm() {
    const errors = [];
    this.processedConfig.config.forEach(conf => {
      const value = this.properties.formData[conf.field];

      // 必填校验
      if (conf.required && (value === undefined || value === null || value === '')) {
        errors.push(`${conf.title} 不能为空！`);
        return;
      }

      // 如果值为空且非必填，则跳过验证
      if ((value === undefined || value === null || value === '') && !conf.required) {
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
            // 检查是否是REGEX_PATTERNS中的模式名称
            if (REGEX_PATTERNS[conf.verify.toUpperCase()]) {
              // 特殊处理身份证号码验证，使用复杂验证函数
              if (conf.verify.toUpperCase() === 'ID_CARD') {
                if (!isValidIDCard(value)) {
                  errors.push(`${conf.title} 身份证号格式错误或无效`);
                }
              } else {
                // 其他正则验证
                const regex = REGEX_PATTERNS[conf.verify.toUpperCase()];
                if (!regex.test(value)) {
                  // 根据验证模式提供更具体的错误提示
                  const errorMessages = {
                    'EMAIL': '邮箱格式错误',
                    'MOBILE_PHONE': '手机号格式错误',
                    'URL': 'URL格式错误',
                    'INTEGER': '请输入整数',
                    'POSITIVE_INTEGER': '请输入正整数',
                    'FLOAT': '请输入数字',
                    'POSITIVE_FLOAT': '请输入正数',
                    'CHINESE': '请输入中文字符',
                    'BANK_CARD': '银行卡号格式错误',
                    'POSTAL_CODE': '邮政编码格式错误',
                    'IP_V4': 'IP地址格式错误',
                    'USERNAME': '用户名格式错误（字母开头，字母数字下划线，4-20位）',
                    'STRONG_PASSWORD': '密码强度不足（至少8位，包含大小写字母、数字和特殊字符）'
                  };
                  errors.push(`${conf.title} ${errorMessages[conf.verify.toUpperCase()] || '格式错误'}`);
                }
              }
            } else {
            // 直接使用正则表达式字符串
            const regex = new RegExp(conf.verify);
            if (!regex.test(value)) {
              errors.push(`${conf.title} 格式错误`);
            }
          }
        }
      }
    });
    return errors;
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

  //属性获取方法
  getProp(propName) {
    const configAttr = this.getAttribute(propName);
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

  setModalName(modalName, initData) {
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
    this.render();
    setTimeout(() => this.open(), 50);
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
