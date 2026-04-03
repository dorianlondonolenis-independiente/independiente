import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('SavedQueries')
export class SavedQuery {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'nvarchar', length: 255 })
  nombre: string;

  @Column({ type: 'nvarchar', length: 255 })
  tableName: string;

  @Column({ type: 'nvarchar', length: 'max' })
  columnNames: string; // JSON array stringificado: ["col1", "col2"]

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  filtros: string | null; // JSON stringificado de filtros opcionales

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  description: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
