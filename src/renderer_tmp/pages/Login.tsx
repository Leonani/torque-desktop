import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Alert } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { setUser } from '../store/authSlice';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/api';

const { Title, Text } = Typography;

const Login: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (values: { email: string; password: string }) => {
    setLoading(true);
    setError(null);

    try {
      // Login with backend API
      const response = await login(values.email, values.password);
      
      // Save token and user to localStorage
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      // Update Redux state
      dispatch(setUser(response.user));
      
      // Navigate to dashboard
      navigate('/vehicles');
    } catch (err) {
      console.error('Login error:', err);
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al iniciar sesión';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      background: '#f0f2f5'
    }}>
      <Card style={{ width: 400, maxWidth: '90%' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Title level={2} style={{ margin: 0 }}>Torque</Title>
          <Text type="secondary">Sistema de Gestión de Taller</Text>
        </div>

        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            style={{ marginBottom: '16px' }}
            closable
            onClose={() => setError(null)}
          />
        )}

        <Form
          form={form}
          name="login"
          onFinish={handleSubmit}
          autoComplete="off"
          layout="vertical"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Por favor ingrese su email' },
              { type: 'email', message: 'Email inválido' }
            ]}
          >
            <Input 
              prefix={<UserOutlined />} 
              placeholder="Email" 
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: 'Por favor ingrese su contraseña' }
            ]}
          >
            <Input.Password 
              prefix={<LockOutlined />} 
              placeholder="Contraseña" 
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              size="large"
              block
            >
              Iniciar Sesión
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center' }}>
            <Text type="secondary">
              ¿No tienes cuenta?{' '}
              <Button type="link" onClick={() => navigate('/register')} style={{ padding: 0 }}>
                Regístrate
              </Button>
            </Text>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default Login;
