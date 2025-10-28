/* 文件路径: frontend/components/modal-registry/modal-registry.js */

// 弹窗配置存储中心
const modalRegistry = {};
// 可用的弹窗配置列表
let availableModalConfigs = [];
// 是否已加载配置列表
let configListLoaded = false;

/**
 * 注册弹窗配置
 * @param {string} modalName 弹窗唯一标识
 * @param {Object} config 弹窗配置
 */
function registerModal(modalName, config) {
  modalRegistry[modalName] = config;
}

/**
 * 从服务器获取可用的弹窗配置列表
 * @returns {Promise<string[]>} 弹窗配置文件列表
 */
async function fetchModalConfigList() {
  try {
    // 动态构建URL路径：当前域名+当前项目+文件相对地址
    const baseUrl = window.location.origin + window.location.pathname.split('/').slice(0, 2).join('/');
    const response = await fetch(`${baseUrl}/components/modal-registry/modals/list-modals.jsp`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const configList = await response.json();
    availableModalConfigs = configList || [];
    configListLoaded = true;
    console.log('成功获取弹窗配置列表:', availableModalConfigs);
    return availableModalConfigs;
  } catch (error) {
    console.error('获取弹窗配置列表失败:', error);
    configListLoaded = true; // 即使失败也标记为已加载，避免重复尝试
    return [];
  }
}

/**
 * 检查弹窗配置是否存在
 * @param {string} modalName 弹窗标识
 * @returns {Promise<boolean>} 是否存在
 */
async function isModalConfigAvailable(modalName) {
  // 如果配置列表未加载，先加载
  if (!configListLoaded) {
    await fetchModalConfigList();
  }
  
  // 检查文件是否在列表中
  const jsFileName = `${modalName}.js`;
  return availableModalConfigs.includes(jsFileName);
}

/**
 * 获取弹窗配置
 * @param {string} modalName 弹窗标识
 * @returns {Promise<Object|null>} 弹窗配置
 */
async function getModalConfig(modalName) {
  // 如果配置已在内存中，直接返回
  if (modalRegistry[modalName]) {
    return modalRegistry[modalName];
  }
  
  // 检查配置是否可用，但即使不可用也尝试加载（开发环境兼容）
  const isAvailable = await isModalConfigAvailable(modalName);
  if (!isAvailable) {
    console.warn(`弹窗配置可能不存在: ${modalName}，但仍尝试加载`);
  }
  
  // 如果配置不在内存中，动态加载
  try {
    console.log(`动态加载弹窗配置: ${modalName}`);
    
    // 改进的路径构建，确保路径正确
    // 获取当前脚本的基础路径
    const scriptPath = document.currentScript?.src || '';
    const basePath = scriptPath.substring(0, scriptPath.lastIndexOf('/') + 1);
    
    // 尝试多种可能的路径格式
    const possiblePaths = [
      `./modals/${modalName}.js`,  // 相对当前页面
      `${basePath}modals/${modalName}.js`,  // 相对当前脚本
      `/components/modal-registry/modals/${modalName}.js`  // 绝对路径
    ];
    
    let module = null;
    let configUrl = null;
    
    // 尝试不同的路径，直到成功加载
    for (const path of possiblePaths) {
      try {
        configUrl = path;
        module = await import(configUrl);
        console.log(`成功加载模块文件: ${configUrl}`);
        break;
      } catch (importError) {
        console.warn(`尝试加载路径 ${path} 失败: ${importError.message}`);
        continue;
      }
    }
    
    // 如果模块加载失败，尝试从window对象获取配置（开发环境回退）
    let config = null;
    if (!module) {
      console.warn(`无法从任何路径加载模块: ${modalName}，尝试从全局对象获取`);
      const camelCaseName = modalName.replace(/-([a-z])/g, g => g[1].toUpperCase());
      const globalConfigKey = `${camelCaseName}ModalConfig`;
      if (window && window[globalConfigKey]) {
        config = window[globalConfigKey];
        console.log(`从全局对象获取配置: ${globalConfigKey}`);
      }
      // 如果还是没有配置，抛出错误
      if (!config) {
        throw new Error(`无法从任何路径加载模块，也未在全局对象中找到配置: ${modalName}`);
      }
    } else {
      // 根据不同的 modalName 获取对应的配置对象
      // 首先尝试默认导出
      if (module.default) {
        config = module.default;
        console.log(`配置文件 ${configUrl} 中找到默认配置对象`);
      }
      
      // 如果没有默认导出，尝试其他命名格式
      if (!config) {
        // 转换modalName为驼峰命名
        const camelCaseName = modalName.replace(/-([a-z])/g, g => g[1].toUpperCase());
        const pascalCaseName = camelCaseName.charAt(0).toUpperCase() + camelCaseName.slice(1);
        
        // 构建所有可能的配置对象名称列表 - 优化顺序，将最可能的匹配放在前面
        const possibleKeys = [
          // 直接使用原始名称（适合如 caizhiModalConfig 这样的命名）
          `${modalName}ModalConfig`,
          // 驼峰命名变体
          `${camelCaseName}ModalConfig`,  // 例如: kucunEditModalConfig
          `${pascalCaseName}ModalConfig`, // 例如: KucunEditModalConfig
          `${camelCaseName}`,             // 例如: kucunEdit
          `${pascalCaseName}`,            // 例如: KucunEdit
          // 通用配置名称
          'modalConfig',
          'ModalConfig',
          'config'
        ];
        
        // 遍历所有可能的键名查找配置
        for (const key of possibleKeys) {
          if (key in module) {
            config = module[key];
            console.log(`配置文件 ${configUrl} 中找到配置对象: ${key}`);
            break;
          }
        }
        
        // 如果还是没找到，尝试遍历整个模块对象查找配置对象
        if (!config) {
          console.log(`尝试遍历模块对象查找配置: ${modalName}`);
          for (const [key, value] of Object.entries(module)) {
            // 检查值是否是对象且包含必要的配置属性
            if (typeof value === 'object' && value !== null && 
                (value.title || value.config || value.onSubmit)) {
              config = value;
              console.log(`通过属性检测找到配置对象: ${key}`);
              break;
            }
          }
        }
      }
    }
    
    if (config) {
      // 将配置缓存到内存中
      registerModal(modalName, config);
      console.log(`成功加载并缓存弹窗配置: ${modalName}`);
      return config;
    } else {
      console.warn(`配置文件 ${configUrl} 中未找到有效的配置对象`);
      return null;
    }
    
  } catch (error) {
    console.error(`加载弹窗配置失败: ${modalName}`, error);
    return null;
  }
}

// 导出函数到全局
window.registerModal = registerModal;
window.getModalConfig = getModalConfig;
window.isModalConfigAvailable = isModalConfigAvailable;
window.fetchModalConfigList = fetchModalConfigList;

export { registerModal, getModalConfig, isModalConfigAvailable, fetchModalConfigList };

// 初始化：获取配置列表
setTimeout(async () => {
  try {
    await fetchModalConfigList();
    console.log('弹窗配置系统初始化完成');
    
    // 标记配置加载完成
    window.modalConfigsLoaded = true;
  } catch (error) {
    console.error('弹窗配置系统初始化失败:', error);
    window.modalConfigsLoaded = true; // 即使失败也标记为已初始化
  }
}, 100);
