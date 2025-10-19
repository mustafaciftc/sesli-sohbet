import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { register, clearError } from '../features/auth/authSlice';
import { toast } from 'react-toastify';

const Register = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, error } = useSelector(state => state.auth);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [formErrors, setFormErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    lowercase: false,
    uppercase: false,
    number: false
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      toast.success('Hoş geldiniz! Oda listesine yönlendiriliyorsunuz...');
      navigate('/rooms');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (error) {
      if (error.includes('Network Error') || error.includes('Failed to fetch')) {
        toast.error('Sunucuya bağlanılamıyor. Lütfen bağlantınızı kontrol edin.');
      } else {
        toast.error(error);
      }
      dispatch(clearError());
    }
  }, [error, dispatch]);

  useEffect(() => {
    const password = formData.password;
    setPasswordStrength({
      length: password.length >= 6,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password)
    });
  }, [formData.password]);

  const validateForm = () => {
    const errors = {};

    if (!formData.username.trim()) {
      errors.username = 'Kullanıcı adı gereklidir';
    } else if (formData.username.length < 3) {
      errors.username = 'Kullanıcı adı en az 3 karakter olmalı';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      errors.username = 'Kullanıcı adı sadece harf, rakam ve alt çizgi içerebilir';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email gereklidir';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Geçerli bir email adresi girin';
    }

    if (!formData.password) {
      errors.password = 'Şifre gereklidir';
    } else if (formData.password.length < 6) {
      errors.password = 'Şifre en az 6 karakter olmalı';
    } else {
      const requirements = [
        /[a-z]/.test(formData.password),
        /[A-Z]/.test(formData.password),
        /\d/.test(formData.password),
        /[!@#$%^&*(),.?":{}|<>]/.test(formData.password)
      ];

      const metRequirements = requirements.filter(Boolean).length;

      if (metRequirements < 2) {
        errors.password = 'Şifre en az iki farklı türde karakter içermeli (harf, rakam, özel karakter)';
      }
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Şifre tekrarı gereklidir';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Şifreler eşleşmiyor';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Lütfen formdaki hataları düzeltin');
      return;
    }

    try {
      const registerData = {
        username: formData.username,
        email: formData.email,
        password: formData.password
      };

      await dispatch(register(registerData)).unwrap();
      toast.success('Kayıt işlemi başarılı! Giriş sayfasına yönlendiriliyorsunuz...');

    } catch (error) {
      console.error('Kayıt hatası:', error);
    }
  };

  const getPasswordInputClass = () => {
    const baseClass = "w-full px-3 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 pr-10";
    
    if (formErrors.password) {
      return `${baseClass} border-red-500 bg-red-50 focus:ring-red-500`;
    }
    
    const metCount = Object.values(passwordStrength).filter(Boolean).length;
    
    if (metCount === 4) {
      return `${baseClass} border-green-500 bg-green-50 focus:ring-green-500`; // Güçlü - Yeşil
    } else if (metCount === 3) {
      return `${baseClass} border-blue-500 bg-blue-50 focus:ring-blue-500`; // İyi - Mavi
    } else if (metCount === 2) {
      return `${baseClass} border-yellow-500 bg-yellow-50 focus:ring-yellow-500`; // Orta - Sarı
    } else if (metCount === 1) {
      return `${baseClass} border-orange-500 bg-orange-50 focus:ring-orange-500`; // Zayıf - Turuncu
    } else {
      return `${baseClass} border-gray-300 focus:ring-purple-500`; // Çok zayıf - Gri
    }
  };

  const getInputClass = (fieldName) => {
    const baseClass = "w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200";
    return formErrors[fieldName]
      ? `${baseClass} border-red-500 bg-red-50`
      : `${baseClass} border-gray-300`;
  };

  const getStrengthColor = (condition) => {
    return condition ? "text-green-600" : "text-gray-500";
  };

  const calculatePasswordStrength = () => {
    const metCount = Object.values(passwordStrength).filter(Boolean).length;
    if (metCount === 4) return { text: 'Güçlü', color: 'text-green-600', width: 'w-full', bgColor: 'bg-green-500' };
    if (metCount === 3) return { text: 'İyi', color: 'text-blue-600', width: 'w-3/4', bgColor: 'bg-blue-500' };
    if (metCount === 2) return { text: 'Orta', color: 'text-yellow-600', width: 'w-1/2', bgColor: 'bg-yellow-500' };
    if (metCount === 1) return { text: 'Zayıf', color: 'text-orange-600', width: 'w-1/4', bgColor: 'bg-orange-500' };
    return { text: 'Çok Zayıf', color: 'text-gray-500', width: 'w-0', bgColor: 'bg-gray-300' };
  };

  const passwordStrengthInfo = calculatePasswordStrength();

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Sesli Sohbet Uygulaması
          </h1>
          <p className="text-white/90">
            Hesap oluştur ve sohbete başla
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            Kayıt Ol
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kullanıcı Adı
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className={getInputClass('username')}
                placeholder="kullaniciadi"
              />
              {formErrors.username && (
                <p className="text-red-500 text-sm mt-1">
                  {formErrors.username}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={getInputClass('email')}
                placeholder="email@example.com"
              />
              {formErrors.email && (
                <p className="text-red-500 text-sm mt-1">
                  {formErrors.email}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Şifre
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={getPasswordInputClass()} 
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m9.02 9.02l3.411 3.411M9.88 9.88l-3.41-3.41m9.02 9.02l3.411 3.411M9.88 9.88l-3.41-3.41" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {formErrors.password && (
                <p className="text-red-500 text-sm mt-1">
                  {formErrors.password}
                </p>
              )}

              {formData.password && (
                <div className="mt-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-600">Şifre gücü:</span>
                    <span className={`text-xs font-medium ${passwordStrengthInfo.color}`}>
                      {passwordStrengthInfo.text}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${passwordStrengthInfo.bgColor}`}
                      style={{
                        width: passwordStrengthInfo.width.replace('w-', '') === 'full' ? '100%' :
                          passwordStrengthInfo.width.replace('w-', '') === '3/4' ? '75%' :
                            passwordStrengthInfo.width.replace('w-', '') === '1/2' ? '50%' : 
                            passwordStrengthInfo.width.replace('w-', '') === '1/4' ? '25%' : '0%'
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Şifre Tekrar
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={getInputClass('confirmPassword') + " pr-10"}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={toggleConfirmPasswordVisibility}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  {showConfirmPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m9.02 9.02l3.411 3.411M9.88 9.88l-3.41-3.41m9.02 9.02l3.411 3.411M9.88 9.88l-3.41-3.41" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {formErrors.confirmPassword && (
                <p className="text-red-500 text-sm mt-1">
                  {formErrors.confirmPassword}
                </p>
              )}
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Şifre önerileri:
              </p>
              <div className="text-xs space-y-1">
                <div className={`flex items-center ${getStrengthColor(passwordStrength.length)}`}>
                  <span className="mr-2">•</span>
                  En az 6 karakter
                </div>
                <div className={`flex items-center ${getStrengthColor(passwordStrength.lowercase || passwordStrength.uppercase)}`}>
                  <span className="mr-2">•</span>
                  Harf içermeli (büyük veya küçük)
                </div>
                <div className={`flex items-center ${getStrengthColor(passwordStrength.number)}`}>
                  <span className="mr-2">•</span>
                  Rakam içermeli
                </div>
                <div className="flex items-center text-gray-500">
                  <span className="mr-2">•</span>
                  Özel karakterler güvenliği artırır
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-200 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Kayıt Yapılıyor...
                </span>
              ) : (
                'Kayıt Ol'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Zaten hesabın var mı?{' '}
              <Link
                to="/login"
                className="text-purple-600 hover:text-purple-700 font-semibold transition-colors duration-200"
              >
                Giriş Yap
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;