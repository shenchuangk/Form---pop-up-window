/**
 * 自定义表单弹窗工具方法
 * 提供各种辅助功能
 */

/**
 * 常用正则表达式集合
 * 提供各种数据格式验证的正则表达式
 */
export const REGEX_PATTERNS = {
  // 邮箱验证
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  
  // 手机号码验证（中国大陆）
  MOBILE_PHONE: /^1[3-9]\d{9}$/,
  
  // 身份证号码验证（中国大陆，基础格式验证）
  ID_CARD: /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/,
  
  // URL验证
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  
  // 整数验证（包括正负整数）
  INTEGER: /^-?\d+$/,
  
  // 正整数验证
  POSITIVE_INTEGER: /^\d+$/,
  
  // 浮点数验证（包括正负浮点数）
  FLOAT: /^-?\d+(\.\d+)?$/,
  
  // 正浮点数验证
  POSITIVE_FLOAT: /^\d+(\.\d+)?$/,
  
  // 中文字符验证
  CHINESE: /^[\u4e00-\u9fa5]+$/,
  
  // 银行卡号验证（简单验证，13-19位数字）
  BANK_CARD: /^\d{13,19}$/,
  
  // 邮政编码验证（中国，6位数字）
  POSTAL_CODE: /^\d{6}$/,
  
  // IP地址验证（IPv4）
  IP_V4: /^((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$/,
  
  // 用户名验证（字母开头，字母数字下划线，4-20位）
  USERNAME: /^[a-zA-Z][a-zA-Z0-9_]{3,19}$/,
  
  // 密码强度验证（至少8位，包含大小写字母、数字和特殊字符）
  STRONG_PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
};


/**
 * 计算数学表达式
 * @param {string} expression - 数学表达式字符串
 * @returns {number} - 计算结果
 */
export function evaluateMathExpression(expression) {
  if (!expression || typeof expression !== 'string') {
    return 0;
  }
  
  // 检查是否包含数学运算符
  if (/[+\-*/()]/.test(expression)) {
    try {
      // 安全的数学表达式计算，只允许数字和基本运算符
      // 使用Function构造函数但限制作用域
      const safeEval = new Function('return ' + expression.replace(/[^0-9+\-*/().\s]/g, ''));
      const result = safeEval();
      
      // 确保结果是数字
      if (typeof result === 'number' && !isNaN(result)) {
        return result;
      }
    } catch (error) {
      console.warn('数学表达式计算错误:', error);
    }
  }
  
  // 如果不是表达式或计算失败，尝试直接解析为数字
  return parseFloat(expression) || 0;
}

/**
 * 增强移动设备体验
 * @param {HTMLElement} element - 需要优化的DOM元素
 */
export function enhanceMobileExperience(element) {
  if (element && !element.hasAttribute('data-mobile-enhanced')) {
    // 增加点击区域大小
    if (element.tagName === 'INPUT' || element.tagName === 'SELECT' || element.tagName === 'TEXTAREA') {
      element.style.minHeight = '44px'; // iOS推荐的最小可点击区域高度
      element.style.fontSize = '16px'; // 防止iOS自动缩放
      element.style.touchAction = 'manipulation'; // 禁用双击缩放
    }
    element.setAttribute('data-mobile-enhanced', 'true');
  }
}

/**
 * 触发自定义事件
 * @param {HTMLElement} element - 触发事件的元素
 * @param {string} eventName - 事件名称
 * @param {*} data - 事件数据
 */
export function triggerEvent(element, eventName, data) {
  const event = new CustomEvent(eventName, {
    detail: data,
    bubbles: true,
    cancelable: true
  });
  element.dispatchEvent(event);
}

/** 
 * 中国大陆身份证号码复杂验证 
 * @param {string} id - 身份证号码 
 * @returns {boolean} 是否有效 
 */ 
export function isValidIDCard(id) { 
  // 步骤1：基础格式校验（18位，前17位数字，最后一位为数字或X/x） 
  if (!/^[1-9]\d{5}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/.test(id)) { 
    return false; 
  } 

  // 统一处理大小写（将x转为X） 
  const idUpper = id.toUpperCase(); 

  // 步骤2：验证出生日期合法性 
  const year = parseInt(idUpper.substr(6, 4), 10); 
  const month = parseInt(idUpper.substr(10, 2), 10); 
  const day = parseInt(idUpper.substr(12, 2), 10); 
  const birthDate = new Date(year, month - 1, day); // 月份在Date中为0-11 
  // 验证日期是否真实存在（如2023-02-30是无效日期） 
  if ( 
    birthDate.getFullYear() !== year || 
    birthDate.getMonth() + 1 !== month || 
    birthDate.getDate() !== day 
  ) { 
    return false; 
  } 

  // 步骤3：验证校验码 
  const factors = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]; // 前17位系数 
  const checkCodeMap = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2']; // 余数对应校验码 
  let sum = 0; 
  for (let i = 0; i < 17; i++) { 
    sum += parseInt(idUpper[i], 10) * factors[i]; 
  } 
  const remainder = sum % 11; // 求和后对11取余 
  const computedCheckCode = checkCodeMap[remainder]; // 计算应有的校验码 
  const actualCheckCode = idUpper[17]; // 实际的校验码 

  return computedCheckCode === actualCheckCode; 
}
