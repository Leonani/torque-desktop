import React, { useState, useRef } from 'react';
import { Form, Input, Button, Card, Typography, Alert, Steps, Space, Row, Col } from 'antd';
import { UserOutlined, LockOutlined, ShopOutlined, IdcardOutlined, MailOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { register } from '../services/api';

const { Title, Text } = Typography;

const Register: React.FC = () => {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  
  const formDataRef = useRef<Record<string, unknown>>({});

  const steps = [
    { title: 'Datos Personales', key: 'personal' },
    { title: 'Taller', key: 'taller' },
    { title: 'Cuenta', key: 'cuenta' },
  ];

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const values = form.getFieldsValue();
      const finalData = { ...formDataRef.current, ...values };
      
      await register({
        nombre: finalData.nombre,
        apellido: finalData.apellido,
        dni: finalData.dni,
        nombreTaller: finalData.nombreTaller,
        email: finalData.email,
        password: finalData.password,
      });

      setSuccess(true);
      formDataRef.current = {};
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      console.error('Registration error:', err);
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al registrar usuario';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const nextStep = async () => {
    try {
      let fieldsToValidate: string[] = [];
      
      if (currentStep === 0) {
        fieldsToValidate = ['nombre', 'apellido', 'dni'];
      } else if (currentStep === 1) {
        fieldsToValidate = ['nombreTaller'];
      } else if (currentStep === 2) {
        fieldsToValidate = ['email', 'password', 'confirmPassword'];
      }

      await form.validateFields(fieldsToValidate);
      
      const values = form.getFieldsValue();
      formDataRef.current = { ...formDataRef.current, ...values };
      
      setCurrentStep(currentStep + 1);
    } catch {
      console.log('Validation failed');
    }
  };

  const prevStep = () => {
    const values = form.getFieldsValue();
    formDataRef.current = { ...formDataRef.current, ...values };
    setCurrentStep(currentStep - 1);
  };

  if (success) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        background: '#f0f2f5'
      }}>
        <Card style={{ width: 400, maxWidth: '90%', textAlign: 'center' }}>
          <Alert
            message="¡Registro exitoso!"
            description="Te hemos enviado un email de bienvenida. Serás redirigido al login..."
            type="success"
            showIcon
          />
        </Card>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      background: '#f0f2f5',
      padding: '24px'
    }}>
      <Card style={{ width: 600, maxWidth: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Title level={2} style={{ margin: 0 }}>Torque</Title>
          <Text type="secondary">Crear Cuenta</Text>
        </div>

        <Steps 
          current={currentStep} 
          style={{ marginBottom: '24px' }}
          items={steps.map(s => ({ title: s.title }))}
        />

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
          name="register"
          autoComplete="off"
          layout="vertical"
        >
          {currentStep === 0 && (
            <>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="nombre"
                    rules={[{ required: true, message: 'Ingrese su nombre' }]}
                  >
                    <Input prefix={<UserOutlined />} placeholder="Nombre" size="large" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="apellido"
                    rules={[{ required: true, message: 'Ingrese su apellido' }]}
                  >
                    <Input prefix={<UserOutlined />} placeholder="Apellido" size="large" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item
                name="dni"
                rules={[
                  { required: true, message: 'Ingrese su DNI' },
                  { pattern: /^\d+$/, message: 'DNI debe contener solo números' }
                ]}
              >
                <Input prefix={<IdcardOutlined />} placeholder="DNI" size="large" maxLength={10} />
              </Form.Item>
            </>
          )}

          {currentStep === 1 && (
            <Form.Item
              name="nombreTaller"
              rules={[{ required: true, message: 'Ingrese el nombre del taller' }]}
            >
              <Input prefix={<ShopOutlined />} placeholder="Nombre del Taller" size="large" />
            </Form.Item>
          )}

          {currentStep === 2 && (
            <>
              <Form.Item
                name="email"
                rules={[
                  { required: true, message: 'Ingrese su email' },
                  { type: 'email', message: 'Email inválido' }
                ]}
              >
                <Input prefix={<MailOutlined />} placeholder="Email" size="large" />
              </Form.Item>
              <Form.Item
                name="password"
                rules={[
                  { required: true, message: 'Ingrese su contraseña' },
                  { min: 6, message: 'Mínimo 6 caracteres' }
                ]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="Contraseña" size="large" />
              </Form.Item>
              <Form.Item
                name="confirmPassword"
                dependencies={['password']}
                rules={[
                  { required: true, message: 'Confirme su contraseña' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('Las contraseñas no coinciden'));
                    },
                  }),
                ]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="Confirmar Contraseña" size="large" />
              </Form.Item>
            </>
          )}

          <Form.Item style={{ marginTop: '24px' }}>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              {currentStep > 0 && (
                <Button onClick={prevStep} size="large">
                  Anterior
                </Button>
              )}
              
              {currentStep < steps.length - 1 ? (
                <Button type="primary" onClick={nextStep} size="large">
                  Siguiente
                </Button>
              ) : (
                <Button type="primary" onClick={handleSubmit} loading={loading} size="large">
                  Registrarse
                </Button>
              )}
            </Space>
          </Form.Item>

          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <Text type="secondary">
              ¿Ya tienes cuenta?{' '}
              <Button type="link" onClick={() => navigate('/login')} style={{ padding: 0 }}>
                Inicia sesión
              </Button>
            </Text>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default Register;
