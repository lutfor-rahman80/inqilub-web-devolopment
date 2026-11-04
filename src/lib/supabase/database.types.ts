
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "activity_categories": {
                  Row: {
                    "cover_image_id": string | null,"created_at": string,"description": string,"description_en": string | null,"icon": string,"id": string,"is_active": boolean,"name_bn": string,"name_en": string | null,"slug": string,"sort_order": number,"summary": string,"summary_en": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cover_image_id"?: string | null,"created_at"?: string,"description"?: string,"description_en"?: string | null,"icon"?: string,"id"?: string,"is_active"?: boolean,"name_bn": string,"name_en"?: string | null,"slug": string,"sort_order"?: number,"summary"?: string,"summary_en"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "cover_image_id"?: string | null,"created_at"?: string,"description"?: string,"description_en"?: string | null,"icon"?: string,"id"?: string,"is_active"?: boolean,"name_bn"?: string,"name_en"?: string | null,"slug"?: string,"sort_order"?: number,"summary"?: string,"summary_en"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "activity_categories_cover_fk"
      columns: ["cover_image_id"]
isOneToOne: false
      referencedRelation: "gallery_images"
      referencedColumns: ["id"]
    }
                  ]
                },"announcements": {
                  Row: {
                    "body": string,"body_en": string | null,"created_at": string,"created_by": string | null,"id": string,"is_pinned": boolean,"is_published": boolean,"published_at": string | null,"title": string,"title_en": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string,"body_en"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"is_pinned"?: boolean,"is_published"?: boolean,"published_at"?: string | null,"title": string,"title_en"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "body"?: string,"body_en"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"is_pinned"?: boolean,"is_published"?: boolean,"published_at"?: string | null,"title"?: string,"title_en"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"application_status_history": {
                  Row: {
                    "application_id": string,"changed_by": string | null,"created_at": string,"from_status": string | null,"id": number,"note": string | null,"to_status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "application_id": string,"changed_by"?: string | null,"created_at"?: string,"from_status"?: string | null,"id"?: never,"note"?: string | null,"to_status": string
                  }
                  Update: {
                    "application_id"?: string,"changed_by"?: string | null,"created_at"?: string,"from_status"?: string | null,"id"?: never,"note"?: string | null,"to_status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "application_status_history_application_id_fkey"
      columns: ["application_id"]
isOneToOne: false
      referencedRelation: "membership_applications"
      referencedColumns: ["id"]
    }
                  ]
                },"audit_logs": {
                  Row: {
                    "action": string,"actor_id": string | null,"actor_name": string | null,"created_at": string,"details": NonNullable<Json>,"entity_id": string | null,"entity_type": string,"id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"actor_name"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"entity_id"?: string | null,"entity_type": string,"id"?: never
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"actor_name"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"entity_id"?: string | null,"entity_type"?: string,"id"?: never
                  }
                  Relationships: [
                    
                  ]
                },"contact_messages": {
                  Row: {
                    "created_at": string,"email": string | null,"id": string,"is_read": boolean,"message": string,"mobile": string | null,"name": string,"subject": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email"?: string | null,"id"?: string,"is_read"?: boolean,"message": string,"mobile"?: string | null,"name": string,"subject": string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string | null,"id"?: string,"is_read"?: boolean,"message"?: string,"mobile"?: string | null,"name"?: string,"subject"?: string
                  }
                  Relationships: [
                    
                  ]
                },"designations": {
                  Row: {
                    "created_at": string,"id": number,"is_active": boolean,"name_bn": string,"name_en": string | null,"rank_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: number,"is_active"?: boolean,"name_bn": string,"name_en"?: string | null,"rank_order"?: number
                  }
                  Update: {
                    "created_at"?: string,"id"?: number,"is_active"?: boolean,"name_bn"?: string,"name_en"?: string | null,"rank_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"faqs": {
                  Row: {
                    "answer_bn": string,"answer_en": string | null,"created_at": string,"id": string,"is_published": boolean,"question_bn": string,"question_en": string | null,"sort_order": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answer_bn": string,"answer_en"?: string | null,"created_at"?: string,"id"?: string,"is_published"?: boolean,"question_bn": string,"question_en"?: string | null,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "answer_bn"?: string,"answer_en"?: string | null,"created_at"?: string,"id"?: string,"is_published"?: boolean,"question_bn"?: string,"question_en"?: string | null,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"gallery_images": {
                  Row: {
                    "caption": string,"category_id": string,"created_at": string,"event_date": string | null,"height": number | null,"id": string,"is_featured": boolean,"is_published": boolean,"program_id": string | null,"size_bytes": number | null,"sort_order": number,"source": string,"storage_path": string,"thumb_path": string | null,"updated_at": string,"uploaded_by": string | null,"width": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "caption"?: string,"category_id": string,"created_at"?: string,"event_date"?: string | null,"height"?: number | null,"id"?: string,"is_featured"?: boolean,"is_published"?: boolean,"program_id"?: string | null,"size_bytes"?: number | null,"sort_order"?: number,"source"?: string,"storage_path": string,"thumb_path"?: string | null,"updated_at"?: string,"uploaded_by"?: string | null,"width"?: number | null
                  }
                  Update: {
                    "caption"?: string,"category_id"?: string,"created_at"?: string,"event_date"?: string | null,"height"?: number | null,"id"?: string,"is_featured"?: boolean,"is_published"?: boolean,"program_id"?: string | null,"size_bytes"?: number | null,"sort_order"?: number,"source"?: string,"storage_path"?: string,"thumb_path"?: string | null,"updated_at"?: string,"uploaded_by"?: string | null,"width"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "gallery_images_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "activity_categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gallery_images_program_id_fkey"
      columns: ["program_id"]
isOneToOne: false
      referencedRelation: "programs"
      referencedColumns: ["id"]
    }
                  ]
                },"members": {
                  Row: {
                    "application_id": string | null,"blood_group": string | null,"created_at": string,"date_of_birth": string | null,"designation_id": number,"directory_consent": boolean,"email": string | null,"full_name": string,"guardian_consent": boolean,"id": string,"joined_on": string,"member_no": string,"mobile": string | null,"notes": string | null,"photo_path": string | null,"public_phone": string | null,"public_phone_consent": boolean,"show_in_directory": boolean,"sort_order": number,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "application_id"?: string | null,"blood_group"?: string | null,"created_at"?: string,"date_of_birth"?: string | null,"designation_id": number,"directory_consent"?: boolean,"email"?: string | null,"full_name": string,"guardian_consent"?: boolean,"id"?: string,"joined_on"?: string,"member_no": string,"mobile"?: string | null,"notes"?: string | null,"photo_path"?: string | null,"public_phone"?: string | null,"public_phone_consent"?: boolean,"show_in_directory"?: boolean,"sort_order"?: number,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "application_id"?: string | null,"blood_group"?: string | null,"created_at"?: string,"date_of_birth"?: string | null,"designation_id"?: number,"directory_consent"?: boolean,"email"?: string | null,"full_name"?: string,"guardian_consent"?: boolean,"id"?: string,"joined_on"?: string,"member_no"?: string,"mobile"?: string | null,"notes"?: string | null,"photo_path"?: string | null,"public_phone"?: string | null,"public_phone_consent"?: boolean,"show_in_directory"?: boolean,"sort_order"?: number,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "members_application_id_fkey"
      columns: ["application_id"]
isOneToOne: true
      referencedRelation: "membership_applications"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "members_designation_id_fkey"
      columns: ["designation_id"]
isOneToOne: false
      referencedRelation: "designations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "members_designation_id_fkey"
      columns: ["designation_id"]
isOneToOne: false
      referencedRelation: "public_members"
      referencedColumns: ["designation_id"]
    }
                  ]
                },"membership_applications": {
                  Row: {
                    "application_no": string,"blood_group": string | null,"created_at": string,"date_of_birth": string,"decision_note": string | null,"declaration_accepted_at": string,"directory_consent": boolean,"email": string | null,"father_name": string,"full_name": string,"id": string,"id_number": string,"id_type": string,"mobile": string,"mother_name": string,"nationality": string,"occupation": string,"permanent_address": string,"present_address": string,"religion": string,"reviewed_at": string | null,"reviewed_by": string | null,"status": string,"submission_token": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "application_no": string,"blood_group"?: string | null,"created_at"?: string,"date_of_birth": string,"decision_note"?: string | null,"declaration_accepted_at": string,"directory_consent"?: boolean,"email"?: string | null,"father_name": string,"full_name": string,"id"?: string,"id_number": string,"id_type": string,"mobile": string,"mother_name": string,"nationality": string,"occupation": string,"permanent_address": string,"present_address": string,"religion": string,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: string,"submission_token"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "application_no"?: string,"blood_group"?: string | null,"created_at"?: string,"date_of_birth"?: string,"decision_note"?: string | null,"declaration_accepted_at"?: string,"directory_consent"?: boolean,"email"?: string | null,"father_name"?: string,"full_name"?: string,"id"?: string,"id_number"?: string,"id_type"?: string,"mobile"?: string,"mother_name"?: string,"nationality"?: string,"occupation"?: string,"permanent_address"?: string,"present_address"?: string,"religion"?: string,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: string,"submission_token"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"notification_log": {
                  Row: {
                    "application_id": string | null,"created_at": string,"error": string | null,"id": number,"kind": string,"recipient": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "application_id"?: string | null,"created_at"?: string,"error"?: string | null,"id"?: never,"kind": string,"recipient": string,"status": string
                  }
                  Update: {
                    "application_id"?: string | null,"created_at"?: string,"error"?: string | null,"id"?: never,"kind"?: string,"recipient"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notification_log_application_id_fkey"
      columns: ["application_id"]
isOneToOne: false
      referencedRelation: "membership_applications"
      referencedColumns: ["id"]
    }
                  ]
                },"permissions": {
                  Row: {
                    "description": string | null,"key": string,"name_bn": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "description"?: string | null,"key": string,"name_bn": string,"sort_order"?: number
                  }
                  Update: {
                    "description"?: string | null,"key"?: string,"name_bn"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"press_items": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"is_published": boolean,"kind": string,"outlet_bn": string,"outlet_en": string | null,"program_id": string | null,"published_on": string,"summary_bn": string | null,"summary_en": string | null,"title_bn": string,"title_en": string | null,"updated_at": string,"url": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"is_published"?: boolean,"kind": string,"outlet_bn": string,"outlet_en"?: string | null,"program_id"?: string | null,"published_on": string,"summary_bn"?: string | null,"summary_en"?: string | null,"title_bn": string,"title_en"?: string | null,"updated_at"?: string,"url": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"is_published"?: boolean,"kind"?: string,"outlet_bn"?: string,"outlet_en"?: string | null,"program_id"?: string | null,"published_on"?: string,"summary_bn"?: string | null,"summary_en"?: string | null,"title_bn"?: string,"title_en"?: string | null,"updated_at"?: string,"url"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "press_items_program_id_fkey"
      columns: ["program_id"]
isOneToOne: false
      referencedRelation: "programs"
      referencedColumns: ["id"]
    }
                  ]
                },"programs": {
                  Row: {
                    "body_bn": string,"body_en": string | null,"category_id": string,"cover_image_id": string | null,"created_at": string,"created_by": string | null,"ends_on": string | null,"first_published_at": string | null,"id": string,"is_published": boolean,"location_bn": string | null,"location_en": string | null,"slug": string,"sort_order": number,"starts_on": string,"status_override": string | null,"summary_bn": string,"summary_en": string | null,"title_bn": string,"title_en": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body_bn"?: string,"body_en"?: string | null,"category_id": string,"cover_image_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"ends_on"?: string | null,"first_published_at"?: string | null,"id"?: string,"is_published"?: boolean,"location_bn"?: string | null,"location_en"?: string | null,"slug": string,"sort_order"?: number,"starts_on": string,"status_override"?: string | null,"summary_bn"?: string,"summary_en"?: string | null,"title_bn": string,"title_en"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "body_bn"?: string,"body_en"?: string | null,"category_id"?: string,"cover_image_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"ends_on"?: string | null,"first_published_at"?: string | null,"id"?: string,"is_published"?: boolean,"location_bn"?: string | null,"location_en"?: string | null,"slug"?: string,"sort_order"?: number,"starts_on"?: string,"status_override"?: string | null,"summary_bn"?: string,"summary_en"?: string | null,"title_bn"?: string,"title_en"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "programs_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "activity_categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "programs_cover_image_id_fkey"
      columns: ["cover_image_id"]
isOneToOne: false
      referencedRelation: "gallery_images"
      referencedColumns: ["id"]
    }
                  ]
                },"role_permissions": {
                  Row: {
                    "permission": string,"role_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "permission": string,"role_id": string
                  }
                  Update: {
                    "permission"?: string,"role_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "role_permissions_permission_fkey"
      columns: ["permission"]
isOneToOne: false
      referencedRelation: "permissions"
      referencedColumns: ["key"]
    },{
      foreignKeyName: "role_permissions_role_id_fkey"
      columns: ["role_id"]
isOneToOne: false
      referencedRelation: "roles"
      referencedColumns: ["id"]
    }
                  ]
                },"roles": {
                  Row: {
                    "created_at": string,"description": string | null,"id": string,"is_system": boolean,"key": string,"name_bn": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"is_system"?: boolean,"key": string,"name_bn": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"is_system"?: boolean,"key"?: string,"name_bn"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"site_settings": {
                  Row: {
                    "key": string,"updated_at": string,"updated_by": string | null,"value": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "key": string,"updated_at"?: string,"updated_by"?: string | null,"value": NonNullable<Json>
                  }
                  Update: {
                    "key"?: string,"updated_at"?: string,"updated_by"?: string | null,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"staff_profiles": {
                  Row: {
                    "created_at": string,"full_name": string,"id": string,"is_active": boolean,"role_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"full_name": string,"id": string,"is_active"?: boolean,"role_id": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"full_name"?: string,"id"?: string,"is_active"?: boolean,"role_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "staff_profiles_role_id_fkey"
      columns: ["role_id"]
isOneToOne: false
      referencedRelation: "roles"
      referencedColumns: ["id"]
    }
                  ]
                },"quiz_results": {
                  Row: {
                    "created_at": string,"gender": string,"id": number,"institution": string,"marks": number | null,"mobile": string | null,"name": string,"roll": string,"round2_marks": number | null,"round2_updated_at": string | null,"year": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"gender": string,"id"?: number,"institution": string,"marks"?: number | null,"mobile"?: string | null,"name": string,"roll": string,"round2_marks"?: number | null,"round2_updated_at"?: string | null,"year"?: number
                  }
                  Update: {
                    "created_at"?: string,"gender"?: string,"id"?: number,"institution"?: string,"marks"?: number | null,"mobile"?: string | null,"name"?: string,"roll"?: string,"round2_marks"?: number | null,"round2_updated_at"?: string | null,"year"?: number
                  }
                  Relationships: [
                    
                  ]
                },"quiz_settings": {
                  Row: {
                    "key": string,"updated_at": string,"value": string,"year": number
                  }
                  ComputedFields: never
                  Insert: {
                    "key": string,"updated_at"?: string,"value": string,"year"?: number
                  }
                  Update: {
                    "key"?: string,"updated_at"?: string,"value"?: string,"year"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "quiz_settings_year_fkey"
      columns: ["year"]
isOneToOne: false
      referencedRelation: "quiz_years"
      referencedColumns: ["year"]
    }
                  ]
                },"quiz_years": {
                  Row: {
                    "created_at": string,"year": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"year": number
                  }
                  Update: {
                    "created_at"?: string,"year"?: number
                  }
                  Relationships: [
                    
                  ]
                },"round2_audit": {
                  Row: {
                    "changed_at": string,"changed_by": string | null,"id": number,"mobile_added": string | null,"new_round2_marks": number | null,"old_round2_marks": number | null,"roll": string,"student_id": number,"year": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "changed_at"?: string,"changed_by"?: string | null,"id"?: number,"mobile_added"?: string | null,"new_round2_marks"?: number | null,"old_round2_marks"?: number | null,"roll": string,"student_id": number,"year"?: number | null
                  }
                  Update: {
                    "changed_at"?: string,"changed_by"?: string | null,"id"?: number,"mobile_added"?: string | null,"new_round2_marks"?: number | null,"old_round2_marks"?: number | null,"roll"?: string,"student_id"?: number,"year"?: number | null
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            "public_members": {
                  Row: {
                    "designation": string,"designation_en": string | null,"designation_id": number,"designation_rank": number,"full_name": string,"id": string,"joined_on": string,"member_no": string,"photo_path": string | null,"public_phone": string | null,"sort_order": number
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "application_contact":
{ Args: { "p_application_id": string }; Returns: {
              "application_no": string,"decision_note": string,"email": string,"full_name": string,"member_no": string,"status": string
            }[]
                           },
"approve_application":
{ Args: { "p_application_id": string,"p_designation_id"?: number,"p_note"?: string,"p_show_in_directory"?: boolean }; Returns: {
              "member_id": string,"member_no": string
            }[]
                           },
"bootstrap_super_admin":
{ Args: { "p_email": string,"p_full_name": string }; Returns: undefined
                           },
"category_photo_counts":
{ Args: Record<PropertyKey, never>; Returns: {
              "category_id": string,"photo_count": number
            }[]
                           },
"check_application_status":
{ Args: { "p_application_no": string,"p_mobile": string }; Returns: {
              "application_no": string,"full_name": string,"member_no": string,"reviewed_at": string,"status": string,"submitted_at": string
            }[]
                           },
"check_rate_limit":
{ Args: { "p_bucket": string,"p_key": string,"p_max": number,"p_window_seconds": number }; Returns: boolean
                           },
"gallery_admin_stats":
{ Args: Record<PropertyKey, never>; Returns: {
              "category_id": string,"featured": number,"published": number,"size_bytes": number,"total": number
            }[]
                           },
"gallery_claim_uploads":
{ Args: { "p_category_id": string,"p_file_ids": (string)[] }; Returns: string[]
                           },
"gallery_move_image":
{ Args: { "p_image_id": string,"p_up": boolean }; Returns: undefined
                           },
"gallery_object_info":
{ Args: { "p_paths": (string)[] }; Returns: {
              "created_at": string,"is_mine": boolean,"is_registered": boolean,"mime_type": string,"name": string,"size_bytes": number
            }[]
                           },
"gallery_release_uploads":
{ Args: { "p_file_ids": (string)[] }; Returns: {
              "file_id": string,"slug": string
            }[]
                           },
"gallery_reserve_uploads":
{ Args: { "p_category_id": string,"p_count": number }; Returns: {
              "file_id": string,"slug": string
            }[]
                           },
"gallery_reserved_file_ids":
{ Args: Record<PropertyKey, never>; Returns: string[]
                           },
"gallery_storage_usage":
{ Args: Record<PropertyKey, never>; Returns: {
              "object_count": number,"total_bytes": number
            }[]
                           },
"gallery_upload_is_reserved":
{ Args: { "p_name": string }; Returns: boolean
                           },
"get_institution_students":
{ Args: { "p_institution"?: string,"p_year"?: number }; Returns: {
              "institution": string,"name": string,"roll": string,"year": number
            }[]
                           },
"get_quiz_institutions":
{ Args: { "p_year"?: number }; Returns: {
              "institution": string,"student_count": number
            }[]
                           },
"get_quiz_years":
{ Args: Record<PropertyKey, never>; Returns: {
              "year": number
            }[]
                           },
"get_student_result":
{ Args: { "p_institution"?: string,"p_roll"?: string,"p_year"?: number }; Returns: {
              "gender": string,"institution": string,"marks": number | null,"name": string,"roll": string,"selected": boolean | null,"year": number
            }[]
                           },
"has_permission":
{ Args: { "p_permission": string }; Returns: boolean
                           },
"is_staff":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_super_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"log_account_event":
{ Args: { "p_action": string,"p_actor": string,"p_target": string }; Returns: undefined
                           },
"move_faq":
{ Args: { "p_direction": string,"p_id": string }; Returns: undefined
                           },
"my_permissions":
{ Args: Record<PropertyKey, never>; Returns: (string)[]
                           },
"program_status":
{ Args: { "p_ends": string,"p_override": string,"p_starts": string }; Returns: string
                           },
"public_stats":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"quiz_admin_add_year":
{ Args: { "p_year": number }; Returns: number
                           },
"quiz_admin_mobiles":
{ Args: { "p_id"?: number | null,"p_year"?: number | null }; Returns: {
              "id": number,"mobile": string | null
            }[]
                           },
"quiz_admin_save_result":
{ Args: { "p_gender"?: string,"p_id"?: number | null,"p_institution"?: string,"p_marks"?: number | null,"p_mobile"?: string | null,"p_name"?: string,"p_roll"?: string,"p_year"?: number }; Returns: {
              "created_at": string,"gender": string,"id": number,"institution": string,"marks": number | null,"mobile": string | null,"name": string,"roll": string,"round2_marks": number | null,"round2_updated_at": string | null,"total_marks": number | null,"year": number
            }[]
                           },
"quiz_admin_set_cutoffs":
{ Args: { "p_boys": number,"p_girls": number,"p_year": number }; Returns: undefined
                           },
"quiz_admin_set_round2":
{ Args: { "p_mobile"?: string | null,"p_overwrite"?: boolean,"p_roll": string,"p_round2_marks": number,"p_year"?: number }; Returns: {
              "id": number,"mobile": string | null,"name": string,"roll": string,"round2_marks": number | null,"total_marks": number | null
            }[]
                           },
"quiz_admin_set_round2_enabled":
{ Args: { "p_enabled": boolean,"p_year": number }; Returns: undefined
                           },
"reject_application":
{ Args: { "p_application_id": string,"p_note": string }; Returns: undefined
                           },
"reopen_application":
{ Args: { "p_application_id": string,"p_note": string }; Returns: undefined
                           },
"set_role_permissions":
{ Args: { "p_permissions": (string)[],"p_role_id": string }; Returns: undefined
                           },
"start_application_review":
{ Args: { "p_application_id": string }; Returns: undefined
                           },
"submit_membership_application":
{ Args: { "p": Json,"p_token": string }; Returns: {
              "already_submitted": boolean,"application_id": string,"application_no": string
            }[]
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
