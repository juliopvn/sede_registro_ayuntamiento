import type { ObjectId } from "mongodb";

export type Rol = "administrado" | "funcionario";

export interface Usuario {
  _id: ObjectId;
  email: string;
  rol: Rol;
  creadoEn: Date;
}

export interface MagicLink {
  _id: ObjectId;
  email: string;
  tokenHash: string;
  expiraEn: Date;
  usadoEn: Date | null;
  creadoEn: Date;
}

export interface Interesado {
  nombre: string;
  nif: string;
  direccionFiscal: string;
}

export interface Representante {
  nombre: string;
  nif: string;
  direccionFiscal: string;
}

export interface Adjunto {
  key: string;
  nombreOriginal: string;
  tipo: string;
  tamano: number;
}

export type EstadoRegistro = "presentado" | "en_tramite";

export interface Registro {
  _id: ObjectId;
  usuarioId: ObjectId;
  usuarioEmail: string;
  interesado: Interesado;
  representante: Representante | null;
  expone: string;
  solicita: string;
  adjuntos: Adjunto[];
  estado: EstadoRegistro;
  creadoEn: Date;
}

export interface Actuacion {
  fecha: Date;
  texto: string;
  autorEmail: string;
}

export type TipoExpediente =
  | "general"
  | "urbanismo"
  | "tributario"
  | "subvenciones"
  | "otros";

export type EstadoExpediente = "abierto" | "cerrado";

export interface Expediente {
  _id: ObjectId;
  codigo: string;
  registroId: ObjectId;
  sujeto: {
    usuarioId: ObjectId;
    nombre: string;
    email: string;
  };
  tipo: TipoExpediente;
  estado: EstadoExpediente;
  actuaciones: Actuacion[];
  creadoEn: Date;
  cerradoEn: Date | null;
}

export interface ConfigHome {
  _id: string;
  nombreOrganismo: string;
  tituloHero: string;
  subtituloHero: string;
  textoIntro: string;
  contactoEmail: string;
  contactoTelefono: string;
  actualizadoEn: Date;
}

export interface SessionUsuario {
  id: string;
  email: string;
  rol: Rol;
}
